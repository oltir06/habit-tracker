const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { calculateStreak } = require('../utils/streak');

// POST /habits/:id/checkin - Mark habit done today
router.post('/:id/checkin', async (req, res) => {
    const habitId = parseInt(req.params.id);

    try {
        // Check if habit exists
        const habitCheck = await db.query('SELECT id FROM habits WHERE id = $1', [habitId]);
        if (habitCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Get today's date in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        // Check for existing check-in
        const existingCheckIn = await db.query(
            'SELECT id FROM check_ins WHERE habit_id = $1 AND date = $2',
            [habitId, today]
        );

        if (existingCheckIn.rows.length > 0) {
            return res.status(400).json({ error: 'Already checked in today' });
        }

        // Create check-in
        const result = await db.query(
            'INSERT INTO check_ins (habit_id, date) VALUES ($1, $2) RETURNING *',
            [habitId, today]
        );

        res.status(201).json({
            message: 'Check-in successful!',
            checkIn: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to check in' });
    }
});

// GET /habits/:id/checkins - Get check-in history for a habit
router.get('/:id/checkins', async (req, res) => {
    const habitId = parseInt(req.params.id);

    try {
        // Check if habit exists
        const habitCheck = await db.query('SELECT id FROM habits WHERE id = $1', [habitId]);
        if (habitCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        const result = await db.query(
            'SELECT * FROM check_ins WHERE habit_id = $1 ORDER BY date DESC',
            [habitId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
});

// GET /habits/:id/streak - Get streak info
router.get('/:id/streak', async (req, res) => {
    const habitId = parseInt(req.params.id);

    try {
        const habitCheck = await db.query('SELECT id FROM habits WHERE id = $1', [habitId]);
        if (habitCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        const result = await db.query(
            "SELECT to_char(date, 'YYYY-MM-DD') as date FROM check_ins WHERE habit_id = $1 ORDER BY date DESC",
            [habitId]
        );

        const habitCheckIns = result.rows;
        const streakInfo = calculateStreak(habitCheckIns);

        res.json({
            habitId: habitId,
            currentStreak: streakInfo.currentStreak,
            longestStreak: streakInfo.longestStreak
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch streak' });
    }
});

module.exports = router;
