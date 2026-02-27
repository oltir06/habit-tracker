const redis = require('../db/redis');
const logger = require('./logger');
const { cacheHits: prometheusCacheHits, cacheMisses: prometheusCacheMisses, cacheHitRate } = require('./metrics');


// In-memory counters for cache statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
const get = async (key) => {
    try {
        const value = await redis.get(key);
        if (value) {
            cacheHits++;
            prometheusCacheHits.inc();

            // Update hit rate
            const total = cacheHits + cacheMisses;
            cacheHitRate.set(cacheHits / total);

            logger.info('Cache hit', { key, totalHits: cacheHits });
            return JSON.parse(value);
        }
        cacheMisses++;
        prometheusCacheMisses.inc();

        // Update hit rate
        const total = cacheHits + cacheMisses;
        cacheHitRate.set(cacheHits / total);

        logger.info('Cache miss', { key, totalMisses: cacheMisses });
        return null;
    } catch (error) {
        logger.error('Cache get error', { key, error: error.message });
        return null; // Fail gracefully
    }
};

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} - Success status
 */
const set = async (key, value, ttl = 300) => {
    try {
        await redis.setex(key, ttl, JSON.stringify(value));
        logger.info('Cache set', { key, ttl });
        return true;
    } catch (error) {
        logger.error('Cache set error', { key, error: error.message });
        return false;
    }
};

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const del = async (key) => {
    try {
        await redis.del(key);
        logger.info('Cache deleted', { key });
        return true;
    } catch (error) {
        logger.error('Cache delete error', { key, error: error.message });
        return false;
    }
};

/**
 * Delete all keys matching pattern
 * @param {string} pattern - Key pattern (e.g., "user:1:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
const delPattern = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length === 0) {
            return 0;
        }
        await redis.del(...keys);
        logger.info('Cache pattern deleted', { pattern, count: keys.length });
        return keys.length;
    } catch (error) {
        logger.error('Cache delete pattern error', { pattern, error: error.message });
        return 0;
    }
};

/**
 * Clear all cache
 * @returns {Promise<boolean>} - Success status
 */
const flush = async () => {
    try {
        await redis.flushdb();
        logger.warn('Cache flushed - all keys deleted');
        return true;
    } catch (error) {
        logger.error('Cache flush error', { error: error.message });
        return false;
    }
};

/**
 * Get cache statistics
 * @returns {Promise<object>} - Cache stats
 */
const stats = async () => {
    try {
        const info = await redis.info('stats');
        const memory = await redis.info('memory');
        const dbSize = await redis.dbsize();

        const totalRequests = cacheHits + cacheMisses;
        const hitRate = totalRequests > 0 ? (cacheHits / totalRequests * 100).toFixed(2) : 0;

        return {
            connected: redis.status === 'ready',
            hits: cacheHits,
            misses: cacheMisses,
            hitRate: `${hitRate}%`,
            totalKeys: dbSize,
            stats: info,
            memory: memory
        };
    } catch (error) {
        logger.error('Cache stats error', { error: error.message });
        return {
            connected: false,
            hits: cacheHits,
            misses: cacheMisses
        };
    }
};

/**
 * Reset cache statistics
 */
const resetStats = () => {
    cacheHits = 0;
    cacheMisses = 0;
    logger.info('Cache statistics reset');
};

module.exports = {
    get,
    set,
    del,
    delPattern,
    flush,
    stats,
    resetStats
};
