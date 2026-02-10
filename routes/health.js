const express = require('express');
const router = express.Router();
const db = require('../db/db');
const logger = require('../utils/logger');

// GET /health - Comprehensive health check
router.get('/', async (req, res) => {
    const startTime = Date.now();

    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.2.0',
        checks: {
            database: 'unknown',
            memory: 'unknown'
        }
    };

    let allHealthy = true;

    // 1. Database Health Check
    try {
        const dbStart = Date.now();
        const result = await db.query('SELECT NOW() as time, version() as version');
        const dbDuration = Date.now() - dbStart;

        healthCheck.checks.database = {
            status: 'healthy',
            responseTime: `${dbDuration}ms`,
            time: result.rows[0].time,
            version: result.rows[0].version.split(' ')[0] // Just "PostgreSQL 14.x"
        };
    } catch (error) {
        allHealthy = false;
        healthCheck.checks.database = {
            status: 'unhealthy',
            error: error.message
        };
        logger.error('Database health check failed', { error: error.message });
    }

    // 2. Memory Health Check
    const memUsage = process.memoryUsage();
    const memHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9; // Alert if >90% heap used

    healthCheck.checks.memory = {
        status: memHealthy ? 'healthy' : 'warning',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    if (!memHealthy) {
        allHealthy = false;
        logger.warn('Memory usage high', healthCheck.checks.memory);
    }

    // 3. Overall Status
    healthCheck.status = allHealthy ? 'OK' : 'DEGRADED';
    healthCheck.responseTime = `${Date.now() - startTime}ms`;

    // Return appropriate status code
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(healthCheck);
});

module.exports = router;
