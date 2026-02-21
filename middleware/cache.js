const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Cache middleware - automatically cache GET requests
 * @param {string} keyPrefix - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key from req
 */
const cacheMiddleware = (keyPrefix, ttl = 300, keyGenerator = null) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        try {
            // Generate cache key
            let cacheKey;
            if (keyGenerator) {
                cacheKey = keyGenerator(req);
            } else {
                const userId = req.userId;
                const habitId = req.params.id;

                if (habitId) {
                    cacheKey = `${keyPrefix}:user:${userId}:habit:${habitId}`;
                } else {
                    cacheKey = `${keyPrefix}:user:${userId}`;
                }
            }

            // Try to get from cache
            const cached = await cache.get(cacheKey);

            if (cached) {
                logger.info('Cache middleware hit', { key: cacheKey });
                return res.json(cached);
            }

            // Cache miss - store original json function
            const originalJson = res.json.bind(res);

            // Override json function to cache response
            res.json = (data) => {
                cache.set(cacheKey, data, ttl).catch(err => {
                    logger.error('Cache middleware set error', { error: err.message });
                });

                return originalJson(data);
            };

            next();

        } catch (error) {
            logger.error('Cache middleware error', { error: error.message });
            next(); // Continue without caching on error
        }
    };
};

/**
 * Invalidate cache for a user
 * @param {number} userId - User ID
 * @param {number} habitId - Habit ID (optional)
 */
const invalidateUserCache = async (userId, habitId = null) => {
    try {
        if (habitId) {
            // Invalidate specific habit cache
            await cache.delPattern(`*:user:${userId}:habit:${habitId}*`);
            logger.info('Invalidated habit cache', { userId, habitId });
        }

        // Always invalidate user's list cache
        await cache.delPattern(`*:user:${userId}:habits*`);
        await cache.delPattern(`*:user:${userId}:list*`);

        logger.info('Invalidated user cache', { userId });
    } catch (error) {
        logger.error('Cache invalidation error', { error: error.message });
    }
};

module.exports = {
    cacheMiddleware,
    invalidateUserCache
};
