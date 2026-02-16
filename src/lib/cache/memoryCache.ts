import type { CacheStore } from '../types';
import type { IDataObject } from 'n8n-workflow';

interface CacheEntry {
	value: IDataObject;
	expiresAt: number;
	lastUsedAt: number;
}

export class MemoryCacheStore implements CacheStore {
	private readonly entries = new Map<string, CacheEntry>();

	constructor(private readonly maxEntries: number) {}

	async get(key: string): Promise<IDataObject | null> {
		const existing = this.entries.get(key);
		if (!existing) {
			return null;
		}

		if (existing.expiresAt < Date.now()) {
			this.entries.delete(key);
			return null;
		}

		existing.lastUsedAt = Date.now();
		return existing.value;
	}

	async set(key: string, value: IDataObject, ttlSec: number): Promise<void> {
		const expiresAt = Date.now() + ttlSec * 1000;
		this.entries.set(key, { value, expiresAt, lastUsedAt: Date.now() });

		if (this.entries.size > this.maxEntries) {
			let oldestKey = '';
			let oldest = Number.POSITIVE_INFINITY;
			for (const [entryKey, entry] of this.entries.entries()) {
				if (entry.lastUsedAt < oldest) {
					oldest = entry.lastUsedAt;
					oldestKey = entryKey;
				}
			}
			if (oldestKey !== '') {
				this.entries.delete(oldestKey);
			}
		}
	}
}
