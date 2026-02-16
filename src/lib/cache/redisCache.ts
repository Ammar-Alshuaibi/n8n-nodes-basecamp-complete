import type { CacheStore } from '../types';
import type { IDataObject } from 'n8n-workflow';

type RedisClient = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, mode: 'EX', ttlSec: number): Promise<string | null>;
};

export class RedisCacheStore implements CacheStore {
	private readonly clientPromise: Promise<RedisClient>;

	constructor(redisUrl: string) {
		this.clientPromise = this.createClient(redisUrl);
	}

	private async createClient(redisUrl: string): Promise<RedisClient> {
		const mod = require('ioredis') as { default?: new (url: string) => RedisClient; new (url: string): RedisClient };
		const RedisCtor = mod.default || mod;
		return new RedisCtor(redisUrl);
	}

	async get(key: string): Promise<IDataObject | null> {
		const client = await this.clientPromise;
		const raw = await client.get(key);
		if (!raw) {
			return null;
		}
		return JSON.parse(raw) as IDataObject;
	}

	async set(key: string, value: IDataObject, ttlSec: number): Promise<void> {
		const client = await this.clientPromise;
		await client.set(key, JSON.stringify(value), 'EX', ttlSec);
	}
}
