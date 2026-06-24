import NodeCache from 'node-cache';
import { logger } from './logger';

class CacheManager {
  private cache: NodeCache;

  constructor(defaultTTL = 300) {
    this.cache = new NodeCache({
      stdTTL: defaultTTL,
      checkperiod: 60,
      useClones: true,
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache expired: ${key}`);
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    return ttl !== undefined
      ? this.cache.set(key, value, ttl)
      : this.cache.set(key, value);
  }

  delete(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return this.cache.keys();
  }

  stats() {
    return this.cache.getStats();
  }
}

export const cache = new CacheManager();

// Specialized caches with different TTLs
export const steamCache = new CacheManager(1800);    // 30 minutes
export const epicCache = new CacheManager(3600);     // 1 hour
export const dealsCache = new CacheManager(3600);    // 1 hour
export const rawgCache = new CacheManager(86400);    // 24 hours
