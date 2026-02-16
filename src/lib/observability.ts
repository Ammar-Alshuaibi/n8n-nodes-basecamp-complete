import type { IDataObject } from 'n8n-workflow';
import type { LogEvent, LogSink } from './types';
import { sanitizeSqlIdentifier } from './utils';

export interface LogConfig {
	sink: LogSink;
	webhookUrl?: string;
	posthogHost?: string;
	posthogApiKey?: string;
	posthogDistinctId?: string;
	postgresDsn?: string;
	postgresTable?: string;
}

type PgPool = {
	query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
};

const pgPools = new Map<string, Promise<PgPool>>();

async function getPgPool(connectionString: string): Promise<PgPool> {
	if (!pgPools.has(connectionString)) {
		pgPools.set(
			connectionString,
			(async () => {
				const pgMod = require('pg') as {
					Pool: new (options: { connectionString: string }) => PgPool;
				};
				return new pgMod.Pool({ connectionString });
			})(),
		);
	}
	return pgPools.get(connectionString)!;
}

async function writeLogToPostgres(config: LogConfig, event: LogEvent): Promise<void> {
	if (!config.postgresDsn) {
		throw new Error('logSink=postgres requires logPostgresDsn');
	}
	const table = sanitizeSqlIdentifier(config.postgresTable || 'ai_orchestrator_logs', 'ai_orchestrator_logs');
	const pool = await getPgPool(config.postgresDsn);
	await pool.query(
		`CREATE TABLE IF NOT EXISTS ${table} (id BIGSERIAL PRIMARY KEY, event JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
	);
	await pool.query(`INSERT INTO ${table} (event) VALUES ($1::jsonb)`, [JSON.stringify(event)]);
}

async function emitWebhook(url: string, payload: IDataObject): Promise<void> {
	await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
}

async function emitPostHog(config: LogConfig, event: LogEvent): Promise<void> {
	if (!config.posthogApiKey) {
		throw new Error('logSink=posthog requires posthogApiKey');
	}
	const host = config.posthogHost || 'https://us.i.posthog.com';
	await fetch(`${host}/capture/`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			api_key: config.posthogApiKey,
			distinct_id: config.posthogDistinctId || event.traceId,
			event: 'ai_orchestrator_execution',
			properties: event,
		}),
	});
}

export async function emitLog(config: LogConfig, event: LogEvent): Promise<void> {
	if (config.sink === 'none') return;

	if (config.sink === 'stdout') {
		// eslint-disable-next-line no-console
		console.log(JSON.stringify({ type: 'ai_orchestrator_execution', ...event }));
		return;
	}

	if (config.sink === 'webhook') {
		if (!config.webhookUrl) {
			throw new Error('logSink=webhook requires logWebhookUrl');
		}
		await emitWebhook(config.webhookUrl, event as unknown as IDataObject);
		return;
	}

	if (config.sink === 'posthog') {
		await emitPostHog(config, event);
		return;
	}

	await writeLogToPostgres(config, event);
}
