import { MODEL_CATALOG, TASK_DEFAULTS } from './providerCatalog';
import type { ModelDefinition, RouteDecision, RoutingPolicy } from './types';
import { estimateTokenCount, qualityRank } from './utils';

interface RouterInput {
	policy: RoutingPolicy;
	availableProviders: Set<ModelDefinition['provider']>;
	promptText: string;
	expectedOutputTokens: number;
}

function score(model: ModelDefinition, priority: RoutingPolicy['priority']): number {
	if (priority === 'cost') {
		return model.costTier * 10 + model.latencyTier - model.jsonReliability;
	}
	if (priority === 'latency') {
		return model.latencyTier * 10 + model.costTier - model.jsonReliability;
	}
	return -qualityRank(model.qualityTier) * 10 + model.costTier + model.latencyTier - model.jsonReliability;
}

function estimatedCostUsd(model: ModelDefinition, promptText: string, expectedOutputTokens: number): number {
	const inputTokens = estimateTokenCount(promptText);
	const inputCost = (inputTokens / 1_000_000) * model.inputUsdPer1M;
	const outputCost = (expectedOutputTokens / 1_000_000) * model.outputUsdPer1M;
	return Number((inputCost + outputCost).toFixed(6));
}

function estimatedLatencyMs(model: ModelDefinition): number {
	if (model.latencyTier === 1) return 1200;
	if (model.latencyTier === 2) return 2600;
	return 4200;
}

function getModel(provider: ModelDefinition['provider'], model: string): ModelDefinition | undefined {
	return MODEL_CATALOG.find((entry) => entry.provider === provider && entry.model === model);
}

export function selectRoute(input: RouterInput): RouteDecision {
	const { policy, availableProviders, promptText, expectedOutputTokens } = input;
	const defaults = TASK_DEFAULTS[policy.taskType]
		.map((candidate) => getModel(candidate.provider, candidate.model))
		.filter((candidate): candidate is ModelDefinition => candidate !== undefined)
		.filter((candidate) => availableProviders.has(candidate.provider));

	if (defaults.length === 0) {
		throw new Error('No available providers. Configure at least one API key in credentials.');
	}

	let candidates = defaults;

	if (policy.providerPreference !== 'auto') {
		const forced = candidates.filter((candidate) => candidate.provider === policy.providerPreference);
		if (forced.length > 0) {
			candidates = forced;
		}
	}

	if (policy.minQualityTier) {
		const minRank = qualityRank(policy.minQualityTier);
		const filtered = candidates.filter((candidate) => qualityRank(candidate.qualityTier) >= minRank);
		if (filtered.length > 0) {
			candidates = filtered;
		}
	}

	if (policy.budgetUsdMax && policy.budgetUsdMax > 0) {
		const filtered = candidates.filter(
			(candidate) => estimatedCostUsd(candidate, promptText, expectedOutputTokens) <= policy.budgetUsdMax!,
		);
		if (filtered.length > 0) {
			candidates = filtered;
		}
	}

	if (policy.latencyMsMax && policy.latencyMsMax > 0) {
		const filtered = candidates.filter((candidate) => estimatedLatencyMs(candidate) <= policy.latencyMsMax!);
		if (filtered.length > 0) {
			candidates = filtered;
		}
	}

	const ranked = [...candidates].sort((a, b) => score(a, policy.priority) - score(b, policy.priority));
	const chosen = ranked[0];

	let fallback = ranked[1];
	if (!fallback && policy.fallbackModelTier !== 'strongest') {
		fallback = MODEL_CATALOG.filter(
			(entry) =>
				availableProviders.has(entry.provider) &&
				qualityRank(entry.qualityTier) > qualityRank(chosen.qualityTier) &&
				entry.contextWindow >= chosen.contextWindow,
		)
			.sort((a, b) => qualityRank(b.qualityTier) - qualityRank(a.qualityTier))[0];
	}

	if (policy.fallbackModelTier === 'strongest') {
		const strongest = MODEL_CATALOG.filter((entry) => availableProviders.has(entry.provider)).sort(
			(a, b) => qualityRank(b.qualityTier) - qualityRank(a.qualityTier) || b.jsonReliability - a.jsonReliability,
		)[0];
		if (strongest && strongest.model !== chosen.model) {
			fallback = strongest;
		}
	}

	return { chosen, fallback };
}
