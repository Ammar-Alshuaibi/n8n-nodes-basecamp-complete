import type { CacheStore } from '../types';
import type { IDataObject } from 'n8n-workflow';

type SqliteDatabase = {
	run(sql: string, params?: unknown[], cb?: (err: Error | null) => void): void;
	get(
		sql: string,
		params: unknown[],
		cb: (err: Error | null, row?: { value?: string }) => void,
	): void;
};

export class SqliteCacheStore implements CacheStore {
	private readonly dbPromise: Promise<SqliteDatabase>;

	constructor(private readonly filePath: string) {
		this.dbPromise = this.init();
	}

	private async init(): Promise<SqliteDatabase> {
		const sqlite = require('sqlite3') as {
			verbose(): {
				Database: new (path: string) => SqliteDatabase;
			};
		};

		const mod = sqlite.verbose();
		const db = new mod.Database(this.filePath);

		await this.run(db, `CREATE TABLE IF NOT EXISTS ai_orchestrator_cache (cache_key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL)`);
		return db;
	}

	private run(db: SqliteDatabase, sql: string, params: unknown[] = []): Promise<void> {
		return new Promise((resolve, reject) => {
			db.run(sql, params, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	private getRow(db: SqliteDatabase, sql: string, params: unknown[] = []): Promise<{ value?: string } | undefined> {
		return new Promise((resolve, reject) => {
			db.get(sql, params, (err, row) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(row);
			});
		});
	}

	async get(key: string): Promise<IDataObject | null> {
		const db = await this.dbPromise;
		const row = await this.getRow(
			db,
			`SELECT value FROM ai_orchestrator_cache WHERE cache_key = ? AND expires_at > ?`,
			[key, Date.now()],
		);
		if (!row?.value) {
			return null;
		}
		return JSON.parse(row.value) as IDataObject;
	}

	async set(key: string, value: IDataObject, ttlSec: number): Promise<void> {
		const db = await this.dbPromise;
		const expiresAt = Date.now() + ttlSec * 1000;
		await this.run(
			db,
			`INSERT INTO ai_orchestrator_cache (cache_key, value, expires_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(cache_key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at`,
			[key, JSON.stringify(value), expiresAt],
		);
	}
}
