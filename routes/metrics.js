const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /metrics - Prometheus-style metrics (basic version)
router.get('/', async (req, res) => {
    try {
        // Get database stats
        const habitsResult = await db.query('SELECT COUNT(*) as count FROM habits');
        const checkInsResult = await db.query('SELECT COUNT(*) as count FROM check_ins');
        
        const metrics = {
            // Process metrics
            process_uptime_seconds: process.uptime(),
            process_memory_heap_used_bytes: process.memoryUsage().heapUsed,
            process_memory_heap_total_bytes: process.memoryUsage().heapTotal,
            process_memory_rss_bytes: process.memoryUsage().rss,
            
            // Application metrics
            habits_total: parseInt(habitsResult.rows[0].count),
            check_ins_total: parseInt(checkInsResult.rows[0].count),
            
            // Node.js info
            nodejs_version: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

module.exports = router;
