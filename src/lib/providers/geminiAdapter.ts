import type { IDataObject } from 'n8n-workflow';
import type { ChatMessage, GenerateInput, GenerateJsonInput, ProviderAdapter, ProviderResult } from '../types';
import { estimateCostUsd } from './cost';
import { postJson } from './http';

function buildGeminiContents(prompt: string, conversation?: ChatMessage[]): IDataObject[] {
	const contents: IDataObject[] = [];
	if (conversation && conversation.length > 0) {
		for (const message of conversation) {
			if (message.role !== 'assistant' && message.role !== 'user') {
				continue;
			}
			contents.push({
				role: message.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: message.content }],
			});
		}
	}

	contents.push({ role: 'user', parts: [{ text: prompt }] });
	return contents;
}

function extractGeminiText(payload: IDataObject): string {
	const candidates = (payload.candidates || []) as IDataObject[];
	const first = (candidates[0] || {}) as IDataObject;
	const content = (first.content || {}) as IDataObject;
	const parts = (content.parts || []) as IDataObject[];
	return parts
		.map((part) => String(part.text || ''))
		.filter((part) => part !== '')
		.join('\n');
}

export class GeminiAdapter implements ProviderAdapter {
	readonly family = 'gemini' as const;

	constructor(private readonly apiKey: string | undefined, private readonly baseUrl: string) {}

	canUse(): boolean {
		return Boolean(this.apiKey && this.apiKey.trim() !== '');
	}

	async generateText(input: GenerateInput): Promise<ProviderResult> {
		if (!this.canUse()) {
			throw new Error('Gemini API key missing');
		}

		const started = Date.now();
		const payload = await postJson(
			`${this.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${this.apiKey}`,
			{
				systemInstruction: { parts: [{ text: input.systemPrompt }] },
				contents: buildGeminiContents(input.prompt, input.conversation),
				generationConfig: {
					temperature: input.temperature,
					topP: input.topP,
					maxOutputTokens: input.maxOutputTokens,
				},
			} as IDataObject,
			{},
		);

		const latencyMs = Date.now() - started;
		const usageRaw = (payload.usageMetadata || {}) as IDataObject;
		const inputTokens = Number(usageRaw.promptTokenCount || 0);
		const outputTokens = Number(usageRaw.candidatesTokenCount || 0);

		return {
			text: extractGeminiText(payload),
			raw: payload,
			provider: 'gemini',
			model: input.model,
			usage: {
				inputTokens,
				outputTokens,
				latencyMs,
				costUsd: estimateCostUsd('gemini', input.model, inputTokens, outputTokens),
			},
		};
	}

	async generateJson(input: GenerateJsonInput): Promise<ProviderResult> {
		if (!this.canUse()) {
			throw new Error('Gemini API key missing');
		}

		const started = Date.now();
		const payload = await postJson(
			`${this.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${this.apiKey}`,
			{
				systemInstruction: {
					parts: [
						{
							text: `${input.systemPrompt}\nReturn strict JSON only.`,
						},
					],
				},
				contents: buildGeminiContents(input.prompt, input.conversation),
				generationConfig: {
					temperature: 0,
					topP: input.topP,
					maxOutputTokens: input.maxOutputTokens,
					responseMimeType: 'application/json',
					responseSchema: input.schema,
				},
			} as IDataObject,
			{},
		);

		const latencyMs = Date.now() - started;
		const usageRaw = (payload.usageMetadata || {}) as IDataObject;
		const inputTokens = Number(usageRaw.promptTokenCount || 0);
		const outputTokens = Number(usageRaw.candidatesTokenCount || 0);

		return {
			text: extractGeminiText(payload),
			raw: payload,
			provider: 'gemini',
			model: input.model,
			usage: {
				inputTokens,
				outputTokens,
				latencyMs,
				costUsd: estimateCostUsd('gemini', input.model, inputTokens, outputTokens),
			},
		};
	}
}
