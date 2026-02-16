import type { IDataObject } from 'n8n-workflow';
import type { ChatMessage, GenerateInput, GenerateJsonInput, ProviderAdapter, ProviderResult } from '../types';
import { estimateCostUsd } from './cost';
import { postJson } from './http';

function buildAnthropicMessages(prompt: string, conversation?: ChatMessage[]): IDataObject[] {
	const messages: IDataObject[] = [];
	if (conversation && conversation.length > 0) {
		for (const message of conversation) {
			if (message.role === 'assistant' || message.role === 'user') {
				messages.push({ role: message.role, content: message.content });
			}
		}
	}
	messages.push({ role: 'user', content: prompt });
	return messages;
}

function extractText(payload: IDataObject): string {
	const content = (payload.content || []) as IDataObject[];
	const textParts = content
		.filter((part) => part.type === 'text')
		.map((part) => String(part.text || ''))
		.filter((part) => part !== '');
	return textParts.join('\n');
}

export class AnthropicAdapter implements ProviderAdapter {
	readonly family = 'anthropic' as const;

	constructor(private readonly apiKey: string | undefined, private readonly baseUrl: string) {}

	canUse(): boolean {
		return Boolean(this.apiKey && this.apiKey.trim() !== '');
	}

	async generateText(input: GenerateInput): Promise<ProviderResult> {
		if (!this.canUse()) {
			throw new Error('Anthropic API key missing');
		}

		const started = Date.now();
		const payload = await postJson(
			`${this.baseUrl}/messages`,
			{
				model: input.model,
				max_tokens: input.maxOutputTokens,
				temperature: input.temperature,
				top_p: input.topP,
				system: input.systemPrompt,
				messages: buildAnthropicMessages(input.prompt, input.conversation),
				metadata: { trace_id: input.traceId },
			} as IDataObject,
			{
				'x-api-key': this.apiKey!,
				'anthropic-version': '2023-06-01',
			},
		);

		const latencyMs = Date.now() - started;
		const usageRaw = (payload.usage || {}) as IDataObject;
		const inputTokens = Number(usageRaw.input_tokens || 0);
		const outputTokens = Number(usageRaw.output_tokens || 0);

		return {
			text: extractText(payload),
			raw: payload,
			provider: 'anthropic',
			model: input.model,
			usage: {
				inputTokens,
				outputTokens,
				latencyMs,
				costUsd: estimateCostUsd('anthropic', input.model, inputTokens, outputTokens),
			},
		};
	}

	async generateJson(input: GenerateJsonInput): Promise<ProviderResult> {
		const strictSystem = [
			input.systemPrompt,
			'You must return valid JSON object only. No markdown.',
			`Schema: ${JSON.stringify(input.schema)}`,
		].join('\n');

		return this.generateText({
			...input,
			systemPrompt: strictSystem,
			temperature: 0,
		});
	}
}
