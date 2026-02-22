const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const redis = require('../db/redis');
const { authenticate } = require('../middleware/auth');

// All cache management routes require authentication
router.use(authenticate);

// GET /cache/stats - Detailed cache statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await cache.stats();
        const dbSize = await redis.dbsize();

        // Get all keys grouped by prefix pattern
        const allKeys = await redis.keys('*');
        const keysByPattern = {};

        allKeys.forEach(key => {
            const pattern = key.split(':')[0];
            keysByPattern[pattern] = (keysByPattern[pattern] || 0) + 1;
        });

        // Get memory info
        const memoryInfo = await redis.info('memory');
        const usedMemoryMatch = memoryInfo.match(/used_memory_human:(\S+)/);
        const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown';

        // Get uptime
        const serverInfo = await redis.info('server');
        const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
        const uptimeSeconds = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

        res.json({
            connected: stats.connected,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hitRate,
            totalKeys: dbSize,
            keysByPattern,
            memory: {
                used: usedMemory
            },
            uptimeSeconds
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});

// POST /cache/clear - Clear all cache
router.post('/clear', async (req, res) => {
    try {
        await cache.flush();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// DELETE /cache/user/:userId - Clear specific user's cache
router.delete('/user/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Only allow users to clear their own cache
    if (userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const deleted = await cache.delPattern(`*:user:${userId}:*`);
        res.json({ message: 'User cache cleared', keysDeleted: deleted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear user cache' });
    }
});

module.exports = router;
