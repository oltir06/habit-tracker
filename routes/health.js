const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /health - Check API and database health
router.get('/', async (req, res) => {
    const healthCheck = {
        uptime: process.uptime(),
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'disconnected'
    };

    try {
        // Test database connection
        const result = await db.query('SELECT NOW()');
        healthCheck.database = 'connected';
        healthCheck.databaseTime = result.rows[0].now;
        
        res.status(200).json(healthCheck);
    } catch (error) {
        healthCheck.status = 'ERROR';
        healthCheck.database = 'disconnected';
        healthCheck.error = error.message;
        
        res.status(503).json(healthCheck);
    }
});

module.exports = router;
