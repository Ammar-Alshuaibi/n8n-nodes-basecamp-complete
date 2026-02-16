import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { createCacheStore } from '../../lib/cache';
import { repairJsonWithModel, parseAndValidateJson } from '../../lib/jsonReliability';
import { emitLog, type LogConfig } from '../../lib/observability';
import { createProviderAdapters } from '../../lib/providers/factory';
import { selectRoute } from '../../lib/router';
import type {
	CacheStore,
	ChatMessage,
	LogEvent,
	NodeMode,
	ProviderAdapter,
	ProviderAuth,
	ProviderFamily,
	ProviderResult,
	RoutingPolicy,
	TaskType,
	UsageNormalized,
} from '../../lib/types';
import { buildTraceId, coerceJsonObject, hashObject, isLikelyPii, nowIso, toErrorMessage } from '../../lib/utils';

const cacheStorePool = new Map<string, Promise<CacheStore>>();

function combineUsage(results: ProviderResult[]): UsageNormalized {
	return results.reduce<UsageNormalized>(
		(acc, result) => ({
			inputTokens: acc.inputTokens + result.usage.inputTokens,
			outputTokens: acc.outputTokens + result.usage.outputTokens,
			costUsd: Number((acc.costUsd + result.usage.costUsd).toFixed(6)),
			latencyMs: acc.latencyMs + result.usage.latencyMs,
		}),
		{ inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0 },
	);
}

function buildTaskPrompt(taskType: TaskType, instructions: string, context: IDataObject, data: IDataObject, schema?: IDataObject): string {
	const sections = [
		`Task Type: ${taskType}`,
		`Instructions:\n${instructions}`,
		`Context JSON:\n${JSON.stringify(context)}`,
		`Data JSON:\n${JSON.stringify(data)}`,
	];

	if (schema && Object.keys(schema).length > 0) {
		sections.push(`Output JSON Schema:\n${JSON.stringify(schema)}`);
		sections.push('Return only JSON matching the schema exactly.');
	}

	return sections.join('\n\n');
}

function toProviderMap(adapters: ProviderAdapter[]): Map<ProviderFamily, ProviderAdapter> {
	const map = new Map<ProviderFamily, ProviderAdapter>();
	for (const adapter of adapters) {
		if (adapter.canUse()) {
			map.set(adapter.family, adapter);
		}
	}
	return map;
}

function getAvailableProviders(adapters: ProviderAdapter[]): Set<ProviderFamily> {
	return new Set(adapters.filter((adapter) => adapter.canUse()).map((adapter) => adapter.family));
}

async function resolveCacheStore(cacheOptions: {
	backend: 'memory' | 'redis' | 'postgres' | 'sqlite';
	maxEntries: number;
	redisUrl?: string;
	postgresDsn?: string;
	postgresTable?: string;
	sqlitePath?: string;
}): Promise<CacheStore> {
	const key = JSON.stringify(cacheOptions);
	if (!cacheStorePool.has(key)) {
		cacheStorePool.set(key, createCacheStore(cacheOptions));
	}
	return cacheStorePool.get(key)!;
}

function buildCacheKey(input: {
	providerFamily: ProviderFamily | 'any';
	taskType: TaskType;
	instructions: string;
	context: IDataObject;
	schema?: IDataObject;
	data: IDataObject;
	temperature: number;
	topP: number;
	toolConfig: IDataObject;
}): string {
	return hashObject([
		input.providerFamily,
		input.taskType,
		input.instructions,
		input.context,
		input.schema || {},
		input.data,
		input.temperature,
		input.topP,
		input.toolConfig,
	]);
}

async function runJsonReliabilityLoop(params: {
	adapter: ProviderAdapter;
	fallbackAdapter?: ProviderAdapter;
	prompt: string;
	systemPrompt: string;
	schema: IDataObject;
	chosenModel: string;
	fallbackModel?: string;
	temperature: number;
	topP: number;
	maxOutputTokens: number;
	traceId: string;
	maxRetries: number;
}): Promise<{
	success: boolean;
	parsed?: IDataObject;
	attempts: ProviderResult[];
	retryReasons: string[];
	schemaErrors: string[];
	lastRaw?: IDataObject;
	modelUsed?: { provider: ProviderFamily; model: string };
}> {
	const attempts: ProviderResult[] = [];
	const retryReasons: string[] = [];
	let schemaErrors: string[] = [];

	const first = await params.adapter.generateJson({
		schema: params.schema,
		systemPrompt: params.systemPrompt,
		prompt: params.prompt,
		model: params.chosenModel,
		temperature: params.temperature,
		topP: params.topP,
		maxOutputTokens: params.maxOutputTokens,
		traceId: params.traceId,
	});
	attempts.push(first);

	const firstValidation = parseAndValidateJson(first.text, params.schema);
	if (firstValidation.ok && firstValidation.parsed) {
		return {
			success: true,
			parsed: firstValidation.parsed,
			attempts,
			retryReasons,
			schemaErrors: [],
			lastRaw: first.raw,
			modelUsed: { provider: first.provider, model: first.model },
		};
	}

	schemaErrors = firstValidation.errors;
	retryReasons.push(`initial-validation-failed: ${firstValidation.errors.join('; ')}`);

	if (params.maxRetries >= 1) {
		const repaired = await repairJsonWithModel(
			params.adapter,
			first,
			params.schema,
			firstValidation.errors,
			params.chosenModel,
			params.traceId,
		);
		attempts.push(repaired);

		const repairValidation = parseAndValidateJson(repaired.text, params.schema);
		if (repairValidation.ok && repairValidation.parsed) {
			return {
				success: true,
				parsed: repairValidation.parsed,
				attempts,
				retryReasons,
				schemaErrors: [],
				lastRaw: repaired.raw,
				modelUsed: { provider: repaired.provider, model: repaired.model },
			};
		}
		schemaErrors = repairValidation.errors;
		retryReasons.push(`repair-validation-failed: ${repairValidation.errors.join('; ')}`);
	}

	if (params.maxRetries >= 2 && params.fallbackAdapter && params.fallbackModel) {
		const fallback = await params.fallbackAdapter.generateJson({
			schema: params.schema,
			systemPrompt: params.systemPrompt,
			prompt: params.prompt,
			model: params.fallbackModel,
			temperature: 0,
			topP: params.topP,
			maxOutputTokens: params.maxOutputTokens,
			traceId: params.traceId,
		});
		attempts.push(fallback);

		const fallbackValidation = parseAndValidateJson(fallback.text, params.schema);
		if (fallbackValidation.ok && fallbackValidation.parsed) {
			return {
				success: true,
				parsed: fallbackValidation.parsed,
				attempts,
				retryReasons,
				schemaErrors: [],
				lastRaw: fallback.raw,
				modelUsed: { provider: fallback.provider, model: fallback.model },
			};
		}
		schemaErrors = fallbackValidation.errors;
		retryReasons.push(`fallback-validation-failed: ${fallbackValidation.errors.join('; ')}`);
	}

	return {
		success: false,
		attempts,
		retryReasons,
		schemaErrors,
		lastRaw: attempts[attempts.length - 1]?.raw,
		modelUsed:
			attempts.length > 0
				? { provider: attempts[attempts.length - 1].provider, model: attempts[attempts.length - 1].model }
				: undefined,
	};
}

async function logExecution(config: LogConfig, event: LogEvent): Promise<void> {
	try {
		await emitLog(config, event);
	} catch {
		// Never fail node execution due to logging transport issues.
	}
}

export class AIOrchestrator implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Orchestrator',
		name: 'aiOrchestrator',
		icon: 'file:ai-orchestrator.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"] + ": " + $parameter["taskType"]}}',
		description:
			'Routing + reliability AI execution across OpenAI, Anthropic, and Gemini with schema guarantees, retries, and caching.',
		defaults: {
			name: 'AI Orchestrator',
		},
			inputs: ['main'],
			outputs: ['main', 'main'],
		outputNames: ['main', 'error'],
		credentials: [
			{
				name: 'aiOrchestratorApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'task',
				options: [
					{ name: 'Task', value: 'task' },
					{ name: 'Chat / Agent-lite', value: 'chat' },
				],
			},
			{
				displayName: 'Task Type',
				name: 'taskType',
				type: 'options',
				default: 'extraction',
				options: [
					{ name: 'Extraction', value: 'extraction' },
					{ name: 'Classification', value: 'classification' },
					{ name: 'Summarization', value: 'summarization' },
					{ name: 'Coding', value: 'coding' },
					{ name: 'Reasoning', value: 'reasoning' },
					{ name: 'Creative', value: 'creative' },
					{ name: 'Safety-Sensitive', value: 'safety-sensitive' },
				],
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 'cost',
				options: [
					{ name: 'Cost', value: 'cost' },
					{ name: 'Latency', value: 'latency' },
					{ name: 'Quality', value: 'quality' },
				],
			},
			{
				displayName: 'Provider Preference',
				name: 'providerPreference',
				type: 'options',
				default: 'auto',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'OpenAI', value: 'openai' },
					{ name: 'Anthropic', value: 'anthropic' },
					{ name: 'Gemini', value: 'gemini' },
				],
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						mode: ['task'],
					},
				},
			},
			{
				displayName: 'Context (JSON)',
				name: 'context',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						mode: ['task'],
					},
				},
			},
			{
				displayName: 'Data (JSON)',
				name: 'data',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						mode: ['task'],
					},
				},
			},
			{
				displayName: 'Output Schema (JSON Schema)',
				name: 'outputSchema',
				type: 'json',
				default: '{}',
				description: 'Optional JSON Schema. If provided, the node enforces deterministic JSON output with retries.',
				displayOptions: {
					show: {
						mode: ['task'],
					},
				},
			},
			{
				displayName: 'System Prompt',
				name: 'chatSystemPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: 'You are a helpful assistant.',
				displayOptions: {
					show: {
						mode: ['chat'],
					},
				},
			},
			{
				displayName: 'User Message',
				name: 'chatMessage',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						mode: ['chat'],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'chatSessionId',
				type: 'string',
				default: 'default',
				displayOptions: {
					show: {
						mode: ['chat'],
					},
				},
			},
			{
				displayName: 'Chat History (JSON Array)',
				name: 'chatHistory',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						mode: ['chat'],
					},
				},
				description: 'Optional list of prior messages: [{"role":"user|assistant","content":"..."}]',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'Max Output Tokens',
				name: 'maxOutputTokens',
				type: 'number',
				default: 1024,
				typeOptions: {
					minValue: 64,
					maxValue: 8192,
				},
			},
			{
				displayName: 'Max Retries',
				name: 'maxRetries',
				type: 'number',
				default: 2,
				typeOptions: {
					minValue: 0,
					maxValue: 5,
				},
			},
			{
				displayName: 'Fallback Model Tier',
				name: 'fallbackModelTier',
				type: 'options',
				default: 'stronger',
				options: [
					{ name: 'Stronger', value: 'stronger' },
					{ name: 'Strongest', value: 'strongest' },
				],
			},
			{
				displayName: 'Minimum Quality Tier',
				name: 'minQualityTier',
				type: 'options',
				default: 'low',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
			},
			{
				displayName: 'Budget USD Max',
				name: 'budgetUsdMax',
				type: 'number',
				default: 0,
				description: '0 disables budget cap',
				typeOptions: {
					minValue: 0,
					numberPrecision: 6,
				},
			},
			{
				displayName: 'Latency Max (ms)',
				name: 'latencyMsMax',
				type: 'number',
				default: 0,
				description: '0 disables latency cap',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Enable Cache',
				name: 'cacheEnabled',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Cache Backend',
				name: 'cacheBackend',
				type: 'options',
				default: 'memory',
				options: [
					{ name: 'Memory', value: 'memory' },
					{ name: 'Redis', value: 'redis' },
					{ name: 'Postgres', value: 'postgres' },
					{ name: 'SQLite', value: 'sqlite' },
				],
				displayOptions: {
					show: {
						cacheEnabled: [true],
					},
				},
			},
			{
				displayName: 'Cache TTL (seconds)',
				name: 'cacheTtlSec',
				type: 'number',
				default: 3600,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						cacheEnabled: [true],
					},
				},
			},
			{
				displayName: 'Cache Max Entries',
				name: 'cacheMaxEntries',
				type: 'number',
				default: 1000,
				typeOptions: {
					minValue: 10,
				},
				displayOptions: {
					show: {
						cacheEnabled: [true],
					},
				},
			},
			{
				displayName: 'Do Not Cache PII',
				name: 'cacheDenyPii',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						cacheEnabled: [true],
					},
				},
			},
			{
				displayName: 'Redis URL',
				name: 'cacheRedisUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						cacheEnabled: [true],
						cacheBackend: ['redis'],
					},
				},
			},
			{
				displayName: 'Postgres DSN',
				name: 'cachePostgresDsn',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						cacheEnabled: [true],
						cacheBackend: ['postgres'],
					},
				},
			},
			{
				displayName: 'Postgres Cache Table',
				name: 'cachePostgresTable',
				type: 'string',
				default: 'ai_orchestrator_cache',
				displayOptions: {
					show: {
						cacheEnabled: [true],
						cacheBackend: ['postgres'],
					},
				},
			},
			{
				displayName: 'SQLite Path',
				name: 'cacheSqlitePath',
				type: 'string',
				default: '/tmp/ai-orchestrator-cache.sqlite',
				displayOptions: {
					show: {
						cacheEnabled: [true],
						cacheBackend: ['sqlite'],
					},
				},
			},
			{
				displayName: 'Log Sink',
				name: 'logSink',
				type: 'options',
				default: 'stdout',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Stdout', value: 'stdout' },
					{ name: 'Webhook', value: 'webhook' },
					{ name: 'PostHog', value: 'posthog' },
					{ name: 'Postgres', value: 'postgres' },
				],
			},
			{
				displayName: 'Webhook URL',
				name: 'logWebhookUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						logSink: ['webhook'],
					},
				},
			},
			{
				displayName: 'PostHog Host',
				name: 'posthogHost',
				type: 'string',
				default: 'https://us.i.posthog.com',
				displayOptions: {
					show: {
						logSink: ['posthog'],
					},
				},
			},
			{
				displayName: 'PostHog API Key',
				name: 'posthogApiKey',
				type: 'string',
				default: '',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						logSink: ['posthog'],
					},
				},
			},
			{
				displayName: 'PostHog Distinct ID',
				name: 'posthogDistinctId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						logSink: ['posthog'],
					},
				},
			},
			{
				displayName: 'Log Postgres DSN',
				name: 'logPostgresDsn',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						logSink: ['postgres'],
					},
				},
			},
			{
				displayName: 'Log Postgres Table',
				name: 'logPostgresTable',
				type: 'string',
				default: 'ai_orchestrator_logs',
				displayOptions: {
					show: {
						logSink: ['postgres'],
					},
				},
			},
			{
				displayName: 'Trace ID',
				name: 'traceId',
				type: 'string',
				default: '',
				description: 'Optional trace ID. Leave empty to auto-generate per item.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const successItems: INodeExecutionData[] = [];
		const errorItems: INodeExecutionData[] = [];
		const sessionMemory = new Map<string, ChatMessage[]>();

		const credentials = await this.getCredentials('aiOrchestratorApi');
		const auth: ProviderAuth = {
			openaiApiKey: String(credentials.openaiApiKey || ''),
			anthropicApiKey: String(credentials.anthropicApiKey || ''),
			geminiApiKey: String(credentials.geminiApiKey || ''),
			openaiBaseUrl: String(credentials.openaiBaseUrl || 'https://api.openai.com/v1'),
			anthropicBaseUrl: String(credentials.anthropicBaseUrl || 'https://api.anthropic.com/v1'),
			geminiBaseUrl: String(credentials.geminiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta'),
		};

		const adapters = createProviderAdapters(auth);
		const providerMap = toProviderMap(adapters);
		const availableProviders = getAvailableProviders(adapters);

		if (availableProviders.size === 0) {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				errorItems.push({
					json: {
						error: 'No providers configured. Add at least one API key in AI Orchestrator credentials.',
						input: items[itemIndex].json,
					},
					pairedItem: { item: itemIndex },
				});
			}
			return [successItems, errorItems];
		}

		const workflowId = this.getWorkflow().id?.toString();
		const nodeId = this.getNode().id;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const startedAt = Date.now();
			let traceId = '';
			let schemaErrors: string[] = [];
			let retryReasons: string[] = [];
			let retries = 0;
			let cacheHit = false;
			let providerUsed: ProviderFamily | undefined;
			let modelUsed: string | undefined;
			let itemSucceeded = false;
			let usage: UsageNormalized = {
				inputTokens: 0,
				outputTokens: 0,
				costUsd: 0,
				latencyMs: 0,
			};

			try {
				const mode = this.getNodeParameter('mode', itemIndex) as NodeMode;
				traceId = buildTraceId(String(this.getNodeParameter('traceId', itemIndex, '') || ''));

				const taskType = this.getNodeParameter('taskType', itemIndex) as TaskType;
				const priority = this.getNodeParameter('priority', itemIndex) as RoutingPolicy['priority'];
				const providerPreference = this.getNodeParameter(
					'providerPreference',
					itemIndex,
				) as RoutingPolicy['providerPreference'];
				const minQualityTier = this.getNodeParameter('minQualityTier', itemIndex) as RoutingPolicy['minQualityTier'];
				const budgetUsdMax = Number(this.getNodeParameter('budgetUsdMax', itemIndex));
				const latencyMsMax = Number(this.getNodeParameter('latencyMsMax', itemIndex));
				const fallbackModelTier = this.getNodeParameter('fallbackModelTier', itemIndex) as RoutingPolicy['fallbackModelTier'];
				const temperature = Number(this.getNodeParameter('temperature', itemIndex));
				const topP = Number(this.getNodeParameter('topP', itemIndex));
				const maxOutputTokens = Number(this.getNodeParameter('maxOutputTokens', itemIndex));
				const maxRetries = Number(this.getNodeParameter('maxRetries', itemIndex));

				const routingPolicy: RoutingPolicy = {
					taskType,
					priority,
					providerPreference,
					fallbackModelTier,
					minQualityTier,
					budgetUsdMax: budgetUsdMax > 0 ? budgetUsdMax : undefined,
					latencyMsMax: latencyMsMax > 0 ? latencyMsMax : undefined,
				};

				if (mode === 'chat') {
						const systemPrompt = String(this.getNodeParameter('chatSystemPrompt', itemIndex));
						const chatMessage = String(this.getNodeParameter('chatMessage', itemIndex));
						const sessionId = String(this.getNodeParameter('chatSessionId', itemIndex, 'default'));
						const chatHistory = this.getNodeParameter('chatHistory', itemIndex, '[]');
						const history = (Array.isArray(chatHistory)
							? chatHistory
							: JSON.parse(String(chatHistory || '[]'))) as unknown[];
						const parsedHistory = history
							.filter((entry: unknown): entry is IDataObject => Boolean(entry) && typeof entry === 'object')
							.map((entry: IDataObject): ChatMessage | null => {
								const role = entry.role;
								const content = entry.content;
								if (
									(role === 'user' || role === 'assistant') &&
									typeof content === 'string' &&
									content.trim() !== ''
								) {
									return { role, content };
								}
								return null;
							})
							.filter((entry: ChatMessage | null): entry is ChatMessage => entry !== null);

					const memory = sessionMemory.get(sessionId) || [];
					const conversation = [...parsedHistory, ...memory];

					const promptText = buildTaskPrompt(taskType, chatMessage, {}, {}, undefined);
					const route = selectRoute({
						policy: routingPolicy,
						availableProviders,
						promptText,
						expectedOutputTokens: maxOutputTokens,
					});

					const adapter = providerMap.get(route.chosen.provider);
					if (!adapter) {
						throw new Error(`Provider adapter not available for ${route.chosen.provider}`);
					}

					const response = await adapter.generateText({
						systemPrompt,
						prompt: chatMessage,
						conversation,
						model: route.chosen.model,
						temperature,
						topP,
						maxOutputTokens,
						traceId,
					});

					providerUsed = response.provider;
					modelUsed = response.model;
					usage = response.usage;

						const nextMemory: ChatMessage[] = [
							...memory,
							{ role: 'user', content: chatMessage },
							{ role: 'assistant', content: response.text },
						];
						sessionMemory.set(sessionId, nextMemory);

					const output: IDataObject = {
						traceId,
						result: response.text,
						raw: response.raw,
						usage: response.usage,
						modelChosen: {
							provider: route.chosen.provider,
							model: route.chosen.model,
							fallback: route.fallback ? { provider: route.fallback.provider, model: route.fallback.model } : undefined,
						},
						retries: 0,
						cacheHit: false,
						conversationSize: nextMemory.length,
					};

						successItems.push({ json: output, pairedItem: { item: itemIndex } });
						itemSucceeded = true;
					} else {
					const instructions = String(this.getNodeParameter('instructions', itemIndex));
					const context = coerceJsonObject(this.getNodeParameter('context', itemIndex, '{}'));
					const data = coerceJsonObject(this.getNodeParameter('data', itemIndex, '{}'));
					const schema = coerceJsonObject(this.getNodeParameter('outputSchema', itemIndex, '{}'));
					const hasSchema = Object.keys(schema).length > 0;

					const systemPrompt = hasSchema
						? 'You are a deterministic workflow engine. Follow instructions exactly and return only strict JSON matching schema.'
						: 'You are a deterministic workflow engine. Follow instructions exactly and return concise output.';

					const prompt = buildTaskPrompt(taskType, instructions, context, data, hasSchema ? schema : undefined);
					const route = selectRoute({
						policy: routingPolicy,
						availableProviders,
						promptText: prompt,
						expectedOutputTokens: maxOutputTokens,
					});

					const primaryAdapter = providerMap.get(route.chosen.provider);
					if (!primaryAdapter) {
						throw new Error(`Provider adapter not available for ${route.chosen.provider}`);
					}
					const fallbackAdapter = route.fallback ? providerMap.get(route.fallback.provider) : undefined;

					const cacheEnabled = Boolean(this.getNodeParameter('cacheEnabled', itemIndex));
					const cacheDenyPii = Boolean(this.getNodeParameter('cacheDenyPii', itemIndex));
					const cacheBackend = this.getNodeParameter('cacheBackend', itemIndex, 'memory') as
						| 'memory'
						| 'redis'
						| 'postgres'
						| 'sqlite';
					const cacheTtlSec = Number(this.getNodeParameter('cacheTtlSec', itemIndex, 3600));
					const cacheMaxEntries = Number(this.getNodeParameter('cacheMaxEntries', itemIndex, 1000));
					const cacheRedisUrl = String(this.getNodeParameter('cacheRedisUrl', itemIndex, ''));
					const cachePostgresDsn = String(this.getNodeParameter('cachePostgresDsn', itemIndex, ''));
					const cachePostgresTable = String(
						this.getNodeParameter('cachePostgresTable', itemIndex, 'ai_orchestrator_cache'),
					);
					const cacheSqlitePath = String(
						this.getNodeParameter('cacheSqlitePath', itemIndex, '/tmp/ai-orchestrator-cache.sqlite'),
					);

					const cacheKey = buildCacheKey({
						providerFamily: providerPreference === 'auto' ? 'any' : providerPreference,
						taskType,
						instructions,
						context,
						schema: hasSchema ? schema : undefined,
						data,
						temperature,
						topP,
						toolConfig: {},
					});

					const cacheInputPayload = JSON.stringify({ taskType, instructions, context, data, schema, temperature, topP });
					const canCache = cacheEnabled && !(cacheDenyPii && isLikelyPii(cacheInputPayload));

					if (canCache) {
						const cacheStore = await resolveCacheStore({
							backend: cacheBackend,
							maxEntries: cacheMaxEntries,
							redisUrl: cacheRedisUrl || undefined,
							postgresDsn: cachePostgresDsn || undefined,
							postgresTable: cachePostgresTable,
							sqlitePath: cacheSqlitePath,
						});

						const cached = await cacheStore.get(cacheKey);
						if (cached) {
							cacheHit = true;
							successItems.push({
								json: {
									...cached,
									traceId,
									cacheHit: true,
								},
								pairedItem: { item: itemIndex },
							});
							itemSucceeded = true;
							const cachedUsage = (cached.usage || {}) as IDataObject;
							usage = {
								inputTokens: Number(cachedUsage.inputTokens || 0),
								outputTokens: Number(cachedUsage.outputTokens || 0),
								costUsd: Number(cachedUsage.costUsd || 0),
								latencyMs: Number(cachedUsage.latencyMs || 0),
							};
							const cachedModel = (cached.modelChosen || {}) as IDataObject;
							providerUsed = (cachedModel.provider as ProviderFamily) || route.chosen.provider;
							modelUsed = String(cachedModel.model || route.chosen.model);
							continue;
						}
					}

					if (hasSchema) {
						const loopResult = await runJsonReliabilityLoop({
							adapter: primaryAdapter,
							fallbackAdapter,
							prompt,
							systemPrompt,
							schema,
							chosenModel: route.chosen.model,
							fallbackModel: route.fallback?.model,
							temperature,
							topP,
							maxOutputTokens,
							traceId,
							maxRetries,
						});

						retries = Math.max(0, loopResult.attempts.length - 1);
						retryReasons = loopResult.retryReasons;
						schemaErrors = loopResult.schemaErrors;
						usage = combineUsage(loopResult.attempts);
						providerUsed = loopResult.modelUsed?.provider || route.chosen.provider;
						modelUsed = loopResult.modelUsed?.model || route.chosen.model;

						if (!loopResult.success || !loopResult.parsed) {
							errorItems.push({
								json: {
									traceId,
									status: 'dead-letter',
									input: { taskType, instructions, context, data, outputSchema: schema },
									errors: [...retryReasons, ...schemaErrors],
									raw: loopResult.lastRaw || {},
									modelChosen: {
										chosen: { provider: route.chosen.provider, model: route.chosen.model },
										fallback: route.fallback
											? { provider: route.fallback.provider, model: route.fallback.model }
											: undefined,
									},
									retries,
									cacheHit: false,
									usage,
								},
								pairedItem: { item: itemIndex },
							});
						} else {
							const payload: IDataObject = {
								traceId,
								result: loopResult.parsed,
								raw: loopResult.lastRaw || {},
								usage,
								modelChosen: {
									provider: providerUsed,
									model: modelUsed,
									fallback: route.fallback ? { provider: route.fallback.provider, model: route.fallback.model } : undefined,
								},
								retries,
								cacheHit: false,
								schemaValidationErrors: schemaErrors,
							};

							if (canCache) {
								const cacheStore = await resolveCacheStore({
									backend: cacheBackend,
									maxEntries: cacheMaxEntries,
									redisUrl: cacheRedisUrl || undefined,
									postgresDsn: cachePostgresDsn || undefined,
									postgresTable: cachePostgresTable,
									sqlitePath: cacheSqlitePath,
								});
								await cacheStore.set(cacheKey, payload, cacheTtlSec);
							}

							successItems.push({ json: payload, pairedItem: { item: itemIndex } });
							itemSucceeded = true;
						}
					} else {
						const response = await primaryAdapter.generateText({
							systemPrompt,
							prompt,
							model: route.chosen.model,
							temperature,
							topP,
							maxOutputTokens,
							traceId,
						});
						usage = response.usage;
						providerUsed = response.provider;
						modelUsed = response.model;

						const payload: IDataObject = {
							traceId,
							result: response.text,
							raw: response.raw,
							usage,
							modelChosen: {
								provider: response.provider,
								model: response.model,
								fallback: route.fallback ? { provider: route.fallback.provider, model: route.fallback.model } : undefined,
							},
							retries: 0,
							cacheHit: false,
						};

						if (canCache) {
							const cacheStore = await resolveCacheStore({
								backend: cacheBackend,
								maxEntries: cacheMaxEntries,
								redisUrl: cacheRedisUrl || undefined,
								postgresDsn: cachePostgresDsn || undefined,
								postgresTable: cachePostgresTable,
								sqlitePath: cacheSqlitePath,
							});
							await cacheStore.set(cacheKey, payload, cacheTtlSec);
						}

						successItems.push({ json: payload, pairedItem: { item: itemIndex } });
						itemSucceeded = true;
					}
				}
			} catch (error) {
				errorItems.push({
					json: {
						traceId: traceId || buildTraceId(),
						status: 'dead-letter',
						input: items[itemIndex].json,
						errors: [toErrorMessage(error)],
						raw: {},
						retries,
						cacheHit,
						usage,
					},
					pairedItem: { item: itemIndex },
				});
			} finally {
				const logSink = this.getNodeParameter('logSink', itemIndex, 'stdout') as LogConfig['sink'];
				const logEvent: LogEvent = {
					traceId: traceId || buildTraceId(),
					workflowId,
					nodeId,
					provider: providerUsed,
					model: modelUsed,
					latencyMs: Date.now() - startedAt,
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					costUsd: usage.costUsd,
					cacheHit,
						retries,
						retryReasons,
						schemaValidationErrors: schemaErrors,
						status: itemSucceeded ? 'success' : 'dead-letter',
						timestamp: nowIso(),
					};

				await logExecution(
					{
						sink: logSink,
						webhookUrl: String(this.getNodeParameter('logWebhookUrl', itemIndex, '')) || undefined,
						posthogApiKey: String(this.getNodeParameter('posthogApiKey', itemIndex, '')) || undefined,
						posthogHost: String(this.getNodeParameter('posthogHost', itemIndex, 'https://us.i.posthog.com')),
						posthogDistinctId: String(this.getNodeParameter('posthogDistinctId', itemIndex, '')) || undefined,
						postgresDsn: String(this.getNodeParameter('logPostgresDsn', itemIndex, '')) || undefined,
						postgresTable: String(this.getNodeParameter('logPostgresTable', itemIndex, 'ai_orchestrator_logs')),
					},
					logEvent,
				);
			}
		}

		return [successItems, errorItems];
	}
}
