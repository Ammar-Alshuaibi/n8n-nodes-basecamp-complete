import type { CacheStore } from '../types';
import type { IDataObject } from 'n8n-workflow';
import { sanitizeSqlIdentifier } from '../utils';

type PgClient = {
	query(text: string, values?: unknown[]): Promise<{ rows: Array<{ value?: unknown }> }>;
};

type PgPool = {
	query(text: string, values?: unknown[]): Promise<{ rows: Array<{ value?: unknown }> }>;
	connect(): Promise<PgClient>;
};

export class PostgresCacheStore implements CacheStore {
	private readonly poolPromise: Promise<PgPool>;
	private readonly safeTableName: string;

	constructor(private readonly connectionString: string, private readonly tableName: string) {
		this.safeTableName = sanitizeSqlIdentifier(tableName, 'ai_orchestrator_cache');
		this.poolPromise = this.init();
	}

	private async init(): Promise<PgPool> {
		const pgMod = require('pg') as {
			Pool: new (options: { connectionString: string }) => PgPool;
		};

		const pool = new pgMod.Pool({ connectionString: this.connectionString });
		await pool.query(
			`CREATE TABLE IF NOT EXISTS ${this.safeTableName} (cache_key TEXT PRIMARY KEY, value JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`,
		);
		return pool;
	}

	async get(key: string): Promise<IDataObject | null> {
		const pool = await this.poolPromise;
		const select = await pool.query(
			`SELECT value FROM ${this.safeTableName} WHERE cache_key = $1 AND expires_at > NOW()`,
			[key],
		);
		if (select.rows.length === 0) {
			return null;
		}

		const value = select.rows[0].value;
		if (!value || typeof value !== 'object') {
			return null;
		}
		return value as IDataObject;
	}

	async set(key: string, value: IDataObject, ttlSec: number): Promise<void> {
		const pool = await this.poolPromise;
		await pool.query(
			`INSERT INTO ${this.safeTableName} (cache_key, value, expires_at) VALUES ($1, $2::jsonb, NOW() + ($3 || ' seconds')::interval)
			 ON CONFLICT (cache_key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
			[key, JSON.stringify(value), String(ttlSec)],
		);
	}
}
