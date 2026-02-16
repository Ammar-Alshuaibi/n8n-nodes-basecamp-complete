import { createHash, randomUUID } from 'crypto';
import type { IDataObject } from 'n8n-workflow';

export function stableStringify(value: unknown): string {
	if (value === null || value === undefined) {
		return 'null';
	}

	if (Array.isArray(value)) {
		return `[${value.map((v) => stableStringify(v)).join(',')}]`;
	}

	if (typeof value === 'object') {
		const sorted = Object.keys(value as Record<string, unknown>)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
		return `{${sorted.join(',')}}`;
	}

	return JSON.stringify(value);
}

export function hashObject(parts: unknown[]): string {
	const hash = createHash('sha256');
	for (const part of parts) {
		hash.update(stableStringify(part));
		hash.update('|');
	}
	return hash.digest('hex');
}

export function coerceJsonObject(value: unknown): IDataObject {
	if (value === null || value === undefined) {
		return {};
	}
	if (typeof value === 'object' && !Array.isArray(value)) {
		return value as IDataObject;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		return JSON.parse(value) as IDataObject;
	}
	return {};
}

export function isLikelyPii(payload: string): boolean {
	const patterns = [
		/\b\d{3}-\d{2}-\d{4}\b/, // ssn
		/\b(?:\d[ -]*?){13,16}\b/, // credit card-ish
		/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // email
	];

	return patterns.some((pattern) => pattern.test(payload));
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function buildTraceId(input?: string): string {
	return input && input.trim() !== '' ? input.trim() : randomUUID();
}

export function qualityRank(tier: 'low' | 'medium' | 'high'): number {
	if (tier === 'low') return 1;
	if (tier === 'medium') return 2;
	return 3;
}

export function estimateTokenCount(text: string): number {
	// Fast heuristic for routing and budget checks.
	return Math.max(1, Math.ceil(text.length / 4));
}

export function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

export function sanitizeSqlIdentifier(value: string, fallback: string): string {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? value : fallback;
}
