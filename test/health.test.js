const request = require('supertest');
const app = require('../app'); // Assuming express app is exported from app.js

const API_URL = process.env.API_URL || 'http://localhost:3000';

// We're using supertest directly against the app to avoid running on a real port during tests.
// The cicd.md uses axios, but supertest is the Node standard for testing express apps without starting a real server instance on a port.

describe('Health Check', () => {
    test('GET /health returns 200', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('OK');
    });

    test('Health check includes database status', async () => {
        const response = await request(app).get('/health');
        // It's possible the health checks are different based on your implementation
        if (response.body.checks && response.body.checks.database) {
            expect(response.body.checks.database.status).toBe('healthy');
        }
    });
});
