const request = require('supertest');
const app = require('../app');

describe('Habits API', () => {
    let accessToken;
    let habitId;

    beforeAll(async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                email: `test-habits-${Date.now()}@example.com`,
                password: 'Test123456',
                name: 'Habits Test User'
            });
        accessToken = response.body.accessToken;
    });

    test('POST /habits creates habit', async () => {
        const response = await request(app)
            .post('/habits')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Test Habit', type: 'build' });

        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe('Test Habit');
        habitId = response.body.id;
    });

    test('GET /habits returns user habits', async () => {
        const response = await request(app)
            .get('/habits')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    test('POST /habits/:id/checkin creates check-in', async () => {
        const response = await request(app)
            .post(`/habits/${habitId}/checkin`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toContain('successful');
    });

    test('GET /habits/:id/streak returns streak', async () => {
        const response = await request(app)
            .get(`/habits/${habitId}/streak`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.currentStreak).toBeDefined();
    });

    test('DELETE /habits/:id deletes habit', async () => {
        const response = await request(app)
            .delete(`/habits/${habitId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.statusCode).toBe(204);
    });
});
