const request = require('supertest');
const app = require('../app');

describe('Authentication', () => {
    const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test123456',
        name: 'Test User'
    };

    let accessToken;

    test('POST /auth/register creates new user', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send(testUser);

        expect(response.statusCode).toBe(201);
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.accessToken).toBeDefined();
        accessToken = response.body.accessToken;
    });

    test('POST /auth/login returns token', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.accessToken).toBeDefined();
    });

    test('GET /auth/me returns current user', async () => {
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.user.email).toBe(testUser.email);
    });

    test('Invalid token returns 401', async () => {
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.statusCode).toBe(401);
    });
});
