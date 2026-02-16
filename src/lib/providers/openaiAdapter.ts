import type { IDataObject } from 'n8n-workflow';
import type { ChatMessage, GenerateInput, GenerateJsonInput, ProviderAdapter, ProviderResult } from '../types';
import { estimateCostUsd } from './cost';
import { postJson } from './http';

function normalizeOpenAiContent(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}
	if (Array.isArray(content)) {
		const textParts = content
			.filter((entry) => typeof entry === 'object' && entry !== null)
			.map((entry) => {
				const cast = entry as IDataObject;
				if (typeof cast.text === 'string') return cast.text;
				if (typeof cast.content === 'string') return cast.content;
				return '';
			})
			.filter((entry) => entry !== '');
		return textParts.join('\n');
	}
	return JSON.stringify(content ?? {});
}

function buildMessages(systemPrompt: string, prompt: string, conversation?: ChatMessage[]): IDataObject[] {
	const messages: IDataObject[] = [];
	if (systemPrompt.trim() !== '') {
		messages.push({ role: 'system', content: systemPrompt });
	}
	if (conversation && conversation.length > 0) {
		for (const message of conversation) {
			if (message.role === 'system') continue;
			messages.push({ role: message.role, content: message.content });
		}
	}
	messages.push({ role: 'user', content: prompt });
	return messages;
}

export class OpenAiAdapter implements ProviderAdapter {
	readonly family = 'openai' as const;

	constructor(private readonly apiKey: string | undefined, private readonly baseUrl: string) {}

	canUse(): boolean {
		return Boolean(this.apiKey && this.apiKey.trim() !== '');
	}

	async generateText(input: GenerateInput): Promise<ProviderResult> {
		if (!this.canUse()) {
			throw new Error('OpenAI API key missing');
		}

		const started = Date.now();
		const payload = await postJson(
			`${this.baseUrl}/chat/completions`,
			{
				model: input.model,
				messages: buildMessages(input.systemPrompt, input.prompt, input.conversation),
				temperature: input.temperature,
				top_p: input.topP,
				max_tokens: input.maxOutputTokens,
				metadata: { traceId: input.traceId },
			} as IDataObject,
			{ Authorization: `Bearer ${this.apiKey}` },
		);

		const latencyMs = Date.now() - started;
		const choices = (payload.choices || []) as IDataObject[];
		const first = (choices[0] || {}) as IDataObject;
		const message = (first.message || {}) as IDataObject;
		const text = normalizeOpenAiContent(message.content);
		const usageRaw = (payload.usage || {}) as IDataObject;
		const inputTokens = Number(usageRaw.prompt_tokens || 0);
		const outputTokens = Number(usageRaw.completion_tokens || 0);

		return {
			text,
			raw: payload,
			provider: 'openai',
			model: input.model,
			usage: {
				inputTokens,
				outputTokens,
				latencyMs,
				costUsd: estimateCostUsd('openai', input.model, inputTokens, outputTokens),
			},
		};
	}

	async generateJson(input: GenerateJsonInput): Promise<ProviderResult> {
		if (!this.canUse()) {
			throw new Error('OpenAI API key missing');
		}

		const started = Date.now();
		const payload = await postJson(
			`${this.baseUrl}/chat/completions`,
			{
				model: input.model,
				messages: buildMessages(input.systemPrompt, input.prompt, input.conversation),
				temperature: input.temperature,
				top_p: input.topP,
				max_tokens: input.maxOutputTokens,
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'ai_orchestrator_output',
						schema: input.schema,
						strict: true,
					},
				},
				metadata: { traceId: input.traceId },
			} as IDataObject,
			{ Authorization: `Bearer ${this.apiKey}` },
		);

		const latencyMs = Date.now() - started;
		const choices = (payload.choices || []) as IDataObject[];
		const first = (choices[0] || {}) as IDataObject;
		const message = (first.message || {}) as IDataObject;
		const text = normalizeOpenAiContent(message.content);
		const usageRaw = (payload.usage || {}) as IDataObject;
		const inputTokens = Number(usageRaw.prompt_tokens || 0);
		const outputTokens = Number(usageRaw.completion_tokens || 0);

		return {
			text,
			raw: payload,
			provider: 'openai',
			model: input.model,
			usage: {
				inputTokens,
				outputTokens,
				latencyMs,
				costUsd: estimateCostUsd('openai', input.model, inputTokens, outputTokens),
			},
		};
	}
}
