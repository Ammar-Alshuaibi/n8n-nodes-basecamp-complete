import { MODEL_CATALOG } from '../providerCatalog';
import type { ProviderFamily } from '../types';

export function estimateCostUsd(provider: ProviderFamily, model: string, inputTokens: number, outputTokens: number): number {
	const match = MODEL_CATALOG.find((entry) => entry.provider === provider && entry.model === model);
	if (!match) return 0;
	const inputCost = (inputTokens / 1_000_000) * match.inputUsdPer1M;
	const outputCost = (outputTokens / 1_000_000) * match.outputUsdPer1M;
	return Number((inputCost + outputCost).toFixed(6));
}
