import type { CacheBackend, CacheStore } from '../types';
import { MemoryCacheStore } from './memoryCache';
import { RedisCacheStore } from './redisCache';
import { PostgresCacheStore } from './postgresCache';
import { SqliteCacheStore } from './sqliteCache';

const memoryInstances = new Map<number, MemoryCacheStore>();

interface CacheFactoryOptions {
	backend: CacheBackend;
	maxEntries: number;
	redisUrl?: string;
	postgresDsn?: string;
	postgresTable?: string;
	sqlitePath?: string;
}

export async function createCacheStore(options: CacheFactoryOptions): Promise<CacheStore> {
	if (options.backend === 'memory') {
		if (!memoryInstances.has(options.maxEntries)) {
			memoryInstances.set(options.maxEntries, new MemoryCacheStore(options.maxEntries));
		}
		return memoryInstances.get(options.maxEntries)!;
	}

	if (options.backend === 'redis') {
		if (!options.redisUrl) {
			throw new Error('cacheBackend=redis requires cacheRedisUrl');
		}
		return new RedisCacheStore(options.redisUrl);
	}

	if (options.backend === 'postgres') {
		if (!options.postgresDsn) {
			throw new Error('cacheBackend=postgres requires cachePostgresDsn');
		}
		return new PostgresCacheStore(options.postgresDsn, options.postgresTable || 'ai_orchestrator_cache');
	}

	if (!options.sqlitePath) {
		throw new Error('cacheBackend=sqlite requires cacheSqlitePath');
	}
	return new SqliteCacheStore(options.sqlitePath);
}
