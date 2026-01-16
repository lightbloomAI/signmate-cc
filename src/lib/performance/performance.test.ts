import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectPool, LRUCache } from './memoryManager';

describe('ObjectPool', () => {
  let pool: ObjectPool<{ id: number; data: string }>;
  let createCount: number;

  beforeEach(() => {
    createCount = 0;
    pool = new ObjectPool({
      factory: () => {
        createCount++;
        return { id: createCount, data: '' };
      },
      reset: (obj) => {
        obj.data = '';
      },
      initialSize: 2,
      maxSize: 5,
    });
  });

  afterEach(() => {
    pool.clear();
  });

  it('should pre-populate pool with initial size', () => {
    expect(createCount).toBe(2);
    expect(pool.getStats().available).toBe(2);
  });

  it('should acquire objects from pool', () => {
    const obj = pool.acquire();

    expect(obj).toBeDefined();
    expect(pool.getStats().inUse).toBe(1);
    expect(pool.getStats().available).toBe(1);
  });

  it('should release objects back to pool', () => {
    const obj = pool.acquire();
    obj.data = 'test';

    pool.release(obj);

    expect(pool.getStats().inUse).toBe(0);
    expect(pool.getStats().available).toBe(2);
    expect(obj.data).toBe(''); // Reset was called
  });

  it('should create new objects when pool is empty', () => {
    pool.acquire(); // 1
    pool.acquire(); // 2
    const obj3 = pool.acquire(); // 3 (new)

    expect(createCount).toBe(3);
    expect(obj3.id).toBe(3);
  });

  it('should not exceed max size when releasing', () => {
    const objects = [];
    for (let i = 0; i < 10; i++) {
      objects.push(pool.acquire());
    }

    objects.forEach((obj) => pool.release(obj));

    expect(pool.getStats().available).toBeLessThanOrEqual(5);
  });

  it('should releaseAll objects', () => {
    pool.acquire();
    pool.acquire();
    pool.acquire();

    expect(pool.getStats().inUse).toBe(3);

    pool.releaseAll();

    expect(pool.getStats().inUse).toBe(0);
    expect(pool.getStats().available).toBeGreaterThan(0);
  });
});

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache(3);
  });

  afterEach(() => {
    cache.clear();
  });

  it('should store and retrieve values', () => {
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should evict oldest item when capacity exceeded', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should update LRU order on access', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' to make it recently used
    cache.get('a');

    cache.set('d', 4); // Should evict 'b' (oldest)

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('should update existing keys', () => {
    cache.set('a', 1);
    cache.set('a', 100);

    expect(cache.get('a')).toBe(100);
    expect(cache.size()).toBe(1);
  });

  it('should check if key exists', () => {
    cache.set('a', 1);

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('a', 1);
    cache.delete('a');

    expect(cache.has('a')).toBe(false);
  });

  it('should evict multiple entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.evict(2);

    expect(cache.size()).toBe(1);
    expect(cache.has('c')).toBe(true); // Most recent kept
  });

  it('should clear all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);

    cache.clear();

    expect(cache.size()).toBe(0);
  });
});

describe('Performance Timing', () => {
  it('should measure operation time accurately', () => {
    const startTime = performance.now();

    // Simulate work
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += i;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(100); // Should be fast
    expect(sum).toBeGreaterThan(0); // Ensure work was done
  });
});

describe('Memory Efficiency', () => {
  it('should efficiently reuse pooled objects', () => {
    const pool = new ObjectPool<number[]>({
      factory: () => new Array(1000).fill(0),
      reset: (arr) => arr.fill(0),
      maxSize: 10,
    });

    const initialCreations = 5;
    const operations = 100;

    // Initial acquisitions
    const objects: number[][] = [];
    for (let i = 0; i < initialCreations; i++) {
      objects.push(pool.acquire());
    }

    // Release all
    objects.forEach((obj) => pool.release(obj));

    // Many more operations should reuse existing objects
    let newCreations = 0;
    const stats = pool.getStats();

    for (let i = 0; i < operations; i++) {
      const obj = pool.acquire();
      pool.release(obj);
    }

    // Should have reused objects, not created many new ones
    const finalStats = pool.getStats();
    newCreations = finalStats.total - stats.total;

    expect(newCreations).toBeLessThan(operations / 2);
  });
});
