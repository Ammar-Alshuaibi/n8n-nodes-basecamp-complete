import type { ProviderAdapter, ProviderAuth } from '../types';
import { AnthropicAdapter } from './anthropicAdapter';
import { GeminiAdapter } from './geminiAdapter';
import { OpenAiAdapter } from './openaiAdapter';

export function createProviderAdapters(auth: ProviderAuth): ProviderAdapter[] {
	return [
		new OpenAiAdapter(auth.openaiApiKey, auth.openaiBaseUrl),
		new AnthropicAdapter(auth.anthropicApiKey, auth.anthropicBaseUrl),
		new GeminiAdapter(auth.geminiApiKey, auth.geminiBaseUrl),
	];
}
