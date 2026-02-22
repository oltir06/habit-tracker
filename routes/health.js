const express = require('express');
const router = express.Router();
const db = require('../db/db');
const redis = require('../db/redis');
const logger = require('../utils/logger');

// GET /health - Comprehensive health check
router.get('/', async (req, res) => {
    const startTime = Date.now();

    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.4.0',
        checks: {
            database: 'unknown',
            cache: 'unknown',
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
            version: result.rows[0].version.split(' ')[0]
        };
    } catch (error) {
        allHealthy = false;
        healthCheck.checks.database = {
            status: 'unhealthy',
            error: error.message
        };
        logger.error('Database health check failed', { error: error.message });
    }

    // 2. Redis Cache Health Check
    try {
        const cacheStart = Date.now();
        await redis.ping();
        const cacheDuration = Date.now() - cacheStart;

        const dbSize = await redis.dbsize();

        healthCheck.checks.cache = {
            status: 'healthy',
            responseTime: `${cacheDuration}ms`,
            keys: dbSize,
            connected: redis.status === 'ready'
        };
    } catch (error) {
        allHealthy = false;
        healthCheck.checks.cache = {
            status: 'unhealthy',
            error: error.message
        };
        logger.error('Cache health check failed', { error: error.message });
    }

    // 3. Memory Health Check
    const memUsage = process.memoryUsage();
    const memHealthy = (memUsage.heapUsed / 1024 / 1024) < 250;

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

    // 4. Overall Status
    healthCheck.status = allHealthy ? 'OK' : 'DEGRADED';
    healthCheck.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(healthCheck);
});

module.exports = router;
