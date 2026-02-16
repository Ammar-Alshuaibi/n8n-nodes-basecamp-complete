import Ajv from 'ajv';
import type { IDataObject } from 'n8n-workflow';
import type { JsonAttemptResult, ProviderAdapter, ProviderResult } from './types';

const ajv = new Ajv({ allErrors: true, strict: false });

function normalizeContent(input: string): string {
	const withoutFences = input
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();

	const objectStart = withoutFences.indexOf('{');
	const objectEnd = withoutFences.lastIndexOf('}');

	if (objectStart >= 0 && objectEnd > objectStart) {
		return withoutFences.slice(objectStart, objectEnd + 1);
	}

	const listStart = withoutFences.indexOf('[');
	const listEnd = withoutFences.lastIndexOf(']');
	if (listStart >= 0 && listEnd > listStart) {
		return withoutFences.slice(listStart, listEnd + 1);
	}

	return withoutFences;
}

function parseCandidate(candidate: string): { parsed?: IDataObject; error?: string } {
	try {
		const parsed = JSON.parse(candidate) as IDataObject;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return { error: 'Parsed JSON is not an object' };
		}
		return { parsed };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

function validateSchema(schema: IDataObject, payload: IDataObject): string[] {
	const validator = ajv.compile(schema as object);
	const valid = validator(payload);
	if (valid) return [];
	return (validator.errors || []).map((entry) => `${entry.instancePath || '/'} ${entry.message || ''}`.trim());
}

export function parseAndValidateJson(rawText: string, schema: IDataObject): JsonAttemptResult {
	const normalized = normalizeContent(rawText);
	const parsed = parseCandidate(normalized);
	if (!parsed.parsed) {
		return {
			ok: false,
			errors: [parsed.error || 'JSON parse failed'],
		};
	}

	const validationErrors = validateSchema(schema, parsed.parsed);
	if (validationErrors.length > 0) {
		return {
			ok: false,
			parsed: parsed.parsed,
			errors: validationErrors,
		};
	}

	return {
		ok: true,
		parsed: parsed.parsed,
		errors: [],
	};
}

export async function repairJsonWithModel(
	adapter: ProviderAdapter,
	result: ProviderResult,
	schema: IDataObject,
	validationErrors: string[],
	baseModel: string,
	traceId: string,
): Promise<ProviderResult> {
	const repairPrompt = [
		'Repair the JSON below so it strictly matches the schema.',
		'Return only JSON. No markdown. No extra keys.',
		`Validation errors: ${validationErrors.join(' | ')}`,
		`Schema: ${JSON.stringify(schema)}`,
		`Broken JSON: ${result.text}`,
	].join('\n');

	return adapter.generateText({
		systemPrompt: 'You are a strict JSON repair engine. Return only valid JSON object.',
		prompt: repairPrompt,
		model: baseModel,
		temperature: 0,
		topP: 1,
		maxOutputTokens: 2048,
		traceId,
	});
}
