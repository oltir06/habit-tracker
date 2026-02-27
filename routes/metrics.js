const express = require('express');
const router = express.Router();
const db = require('../db/db');
const cache = require('../utils/cache');

// GET /metrics - Prometheus-style metrics
router.get('/', async (req, res) => {
    try {
        // Get database stats
        const habitsResult = await db.query('SELECT COUNT(*) as count FROM habits');
        const checkInsResult = await db.query('SELECT COUNT(*) as count FROM check_ins');
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');

        // Get cache stats
        const cacheStats = await cache.stats();

        const metrics = {
            // Process metrics
            process_uptime_seconds: process.uptime(),
            process_memory_heap_used_bytes: process.memoryUsage().heapUsed,
            process_memory_heap_total_bytes: process.memoryUsage().heapTotal,
            process_memory_rss_bytes: process.memoryUsage().rss,

            // Application metrics
            users_total: parseInt(usersResult.rows[0].count),
            habits_total: parseInt(habitsResult.rows[0].count),
            check_ins_total: parseInt(checkInsResult.rows[0].count),

            // Cache metrics
            cache_connected: cacheStats.connected,
            cache_hits: cacheStats.hits,
            cache_misses: cacheStats.misses,
            cache_hit_rate: cacheStats.hitRate,
            cache_total_keys: cacheStats.totalKeys,

            // Node.js info
            nodejs_version: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

const {
    register,
    usersTotal,
    habitsTotal,
    checkInsTotal,
    checkInsToday,
    dbConnectionsActive
} = require('../utils/metrics');

// NEW: Prometheus metrics endpoint
router.get('/prometheus', async (req, res) => {
    try {
        // Update business metrics before scrape
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
        const habitsResult = await db.query('SELECT COUNT(*) as count FROM habits');
        const checkInsResult = await db.query('SELECT COUNT(*) as count FROM check_ins');
        const todayCheckIns = await db.query(
            "SELECT COUNT(*) as count FROM check_ins WHERE date = CURRENT_DATE"
        );

        usersTotal.set(parseInt(usersResult.rows[0].count));
        habitsTotal.set(parseInt(habitsResult.rows[0].count));
        checkInsTotal.set(parseInt(checkInsResult.rows[0].count));
        checkInsToday.set(parseInt(todayCheckIns.rows[0].count));

        // Get active connections (approximate)
        dbConnectionsActive.set(db?.totalCount ?? 0);

        // Return Prometheus format
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error.message);
    }
});

module.exports = router;
