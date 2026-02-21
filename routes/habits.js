const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { calculateStreak } = require('../utils/streak');
const { authenticate } = require('../middleware/auth');
const cache = require('../utils/cache');

// ALL routes now require authentication
router.use(authenticate);

// POST /habits - Create a new habit (user-specific)
router.post('/', async (req, res) => {
    const { name, description, type, frequency } = req.body;
    const userId = req.userId;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const validTypes = ['build', 'break'];
    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type must be "build" or "break"' });
    }

    try {
        const result = await db.query(
            'INSERT INTO habits (user_id, name, description, type, frequency) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, name, description || '', type || 'build', frequency || 'daily']
        );

        // Invalidate user's habits cache
        await cache.delPattern(`user:${userId}:habits*`);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to create habit' });
    }
});

// GET /habits - Get all habits (user-specific only)
router.get('/', async (req, res) => {
    const userId = req.userId;
    const cacheKey = `user:${userId}:habits`;

    try {
        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Cache miss - query database
        const result = await db.query(
            'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Save to cache (5 minutes)
        await cache.set(cacheKey, result.rows, 300);

        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

// GET /habits/stats - Get overview stats for all user's habits
router.get('/stats', async (req, res) => {
    const userId = req.userId;
    const cacheKey = `user:${userId}:habits:stats`;

    try {
        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Fetch only user's habits
        const habitsResult = await db.query(
            'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        const habits = habitsResult.rows;

        // Fetch check-ins for user's habits only
        const checkInsResult = await db.query(
            `SELECT ci.habit_id, to_char(ci.date, 'YYYY-MM-DD') as date 
             FROM check_ins ci
             INNER JOIN habits h ON ci.habit_id = h.id
             WHERE h.user_id = $1
             ORDER BY ci.date DESC`,
            [userId]
        );
        const allCheckIns = checkInsResult.rows;

        // Group check-ins by habit_id
        const checkInsByHabit = {};
        allCheckIns.forEach(ci => {
            if (!checkInsByHabit[ci.habit_id]) {
                checkInsByHabit[ci.habit_id] = [];
            }
            checkInsByHabit[ci.habit_id].push(ci);
        });

        // Calculate stats
        const stats = habits.map((habit) => {
            const habitCheckIns = checkInsByHabit[habit.id] || [];
            const streakInfo = calculateStreak(habitCheckIns);
            return {
                habitId: habit.id,
                name: habit.name,
                currentStreak: streakInfo.currentStreak,
                longestStreak: streakInfo.longestStreak
            };
        });

        // Save to cache (5 minutes)
        await cache.set(cacheKey, stats, 300);

        res.json(stats);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habit stats' });
    }
});

// GET /habits/:id - Get a single habit (verify ownership)
router.get('/:id', async (req, res) => {
    const userId = req.userId;

    try {
        const result = await db.query(
            'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
            [req.params.id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habit' });
    }
});

// PUT /habits/:id - Update a habit (verify ownership)
router.put('/:id', async (req, res) => {
    const { name, description, type, frequency } = req.body;
    const userId = req.userId;

    const validTypes = ['build', 'break'];
    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type must be "build" or "break"' });
    }

    try {
        // First verify ownership
        const ownerCheck = await db.query(
            'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
            [req.params.id, userId]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (type) {
            updates.push(`type = $${paramCount++}`);
            values.push(type);
        }
        if (frequency) {
            updates.push(`frequency = $${paramCount++}`);
            values.push(frequency);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.params.id);
        values.push(userId);
        const query = `UPDATE habits SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;

        const result = await db.query(query, values);

        // Invalidate user's habits cache
        await cache.delPattern(`user:${userId}:habits*`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to update habit' });
    }
});

// DELETE /habits/:id - Delete a habit (verify ownership)
router.delete('/:id', async (req, res) => {
    const userId = req.userId;

    try {
        const result = await db.query(
            'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Invalidate user's habits cache
        await cache.delPattern(`user:${userId}:habits*`);

        res.status(204).send();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to delete habit' });
    }
});

// GET /habits/:id/stats - Get full stats for a habit (verify ownership)
router.get('/:id/stats', async (req, res) => {
    const habitId = parseInt(req.params.id);
    const userId = req.userId;

    try {
        const habitResult = await db.query(
            'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
            [habitId, userId]
        );

        if (habitResult.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }
        const habit = habitResult.rows[0];

        const checkInsResult = await db.query(
            "SELECT to_char(date, 'YYYY-MM-DD') as date FROM check_ins WHERE habit_id = $1 ORDER BY date ASC",
            [habitId]
        );
        const habitCheckIns = checkInsResult.rows;

        const streakInfo = calculateStreak(habitCheckIns);
        const totalCheckIns = habitCheckIns.length;

        let firstCheckIn = null;
        let lastCheckIn = null;
        let completionRate = 0;

        if (totalCheckIns > 0) {
            firstCheckIn = habitCheckIns[0].date;
            lastCheckIn = habitCheckIns[totalCheckIns - 1].date;

            const today = new Date();
            const firstCheckInDate = new Date(firstCheckIn);
            today.setHours(0, 0, 0, 0);
            firstCheckInDate.setHours(0, 0, 0, 0);
            const diffTime = Math.abs(today - firstCheckInDate);
            const daysSinceFirst = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            completionRate = totalCheckIns / daysSinceFirst;
            if (completionRate > 1) completionRate = 1;
            completionRate = Math.round(completionRate * 100) / 100;
        }

        res.json({
            habitId: habit.id,
            name: habit.name,
            type: habit.type,
            totalCheckIns,
            currentStreak: streakInfo.currentStreak,
            longestStreak: streakInfo.longestStreak,
            completionRate,
            firstCheckIn,
            lastCheckIn
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habit stats' });
    }
});

module.exports = router;
