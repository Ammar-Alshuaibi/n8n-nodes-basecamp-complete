import type { IDataObject } from 'n8n-workflow';

export type TaskType =
	| 'extraction'
	| 'classification'
	| 'summarization'
	| 'coding'
	| 'reasoning'
	| 'creative'
	| 'safety-sensitive';

export type Priority = 'cost' | 'latency' | 'quality';

export type QualityTier = 'low' | 'medium' | 'high';

export type ProviderFamily = 'openai' | 'anthropic' | 'gemini';

export type NodeMode = 'task' | 'chat';

export type CacheBackend = 'memory' | 'redis' | 'postgres' | 'sqlite';

export type LogSink = 'none' | 'stdout' | 'webhook' | 'posthog' | 'postgres';

export interface ModelDefinition {
	provider: ProviderFamily;
	model: string;
	qualityTier: QualityTier;
	costTier: 1 | 2 | 3;
	latencyTier: 1 | 2 | 3;
	contextWindow: number;
	jsonReliability: number;
	inputUsdPer1M: number;
	outputUsdPer1M: number;
}

export interface RoutingPolicy {
	taskType: TaskType;
	priority: Priority;
	budgetUsdMax?: number;
	latencyMsMax?: number;
	minQualityTier?: QualityTier;
	providerPreference: ProviderFamily | 'auto';
	fallbackModelTier: 'stronger' | 'strongest';
}

export interface ProviderAuth {
	openaiApiKey?: string;
	anthropicApiKey?: string;
	geminiApiKey?: string;
	openaiBaseUrl: string;
	anthropicBaseUrl: string;
	geminiBaseUrl: string;
}

export interface UsageNormalized {
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	latencyMs: number;
}

export interface GenerateInput {
	systemPrompt: string;
	prompt: string;
	model: string;
	temperature: number;
	topP: number;
	maxOutputTokens: number;
	traceId: string;
	conversation?: ChatMessage[];
}

export interface GenerateJsonInput extends GenerateInput {
	schema: IDataObject;
}

export interface ProviderResult {
	text: string;
	raw: IDataObject;
	usage: UsageNormalized;
	provider: ProviderFamily;
	model: string;
}

export interface ProviderAdapter {
	readonly family: ProviderFamily;
	canUse(): boolean;
	generateText(input: GenerateInput): Promise<ProviderResult>;
	generateJson(input: GenerateJsonInput): Promise<ProviderResult>;
}

export interface CacheRecord {
	value: IDataObject;
	expiresAt: number;
}

export interface CacheStore {
	get(key: string): Promise<IDataObject | null>;
	set(key: string, value: IDataObject, ttlSec: number): Promise<void>;
}

export interface LogEvent {
	traceId: string;
	workflowId?: string;
	nodeId?: string;
	provider?: ProviderFamily;
	model?: string;
	latencyMs?: number;
	inputTokens?: number;
	outputTokens?: number;
	costUsd?: number;
	cacheHit: boolean;
	retries: number;
	retryReasons: string[];
	schemaValidationErrors: string[];
	status: 'success' | 'dead-letter';
	timestamp: string;
}

export interface RouteDecision {
	chosen: ModelDefinition;
	fallback?: ModelDefinition;
}

export interface JsonAttemptResult {
	ok: boolean;
	parsed?: IDataObject;
	errors: string[];
	repairedRaw?: string;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}
