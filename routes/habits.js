const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { calculateStreak } = require('../utils/streak');

// POST /habits - Create a new habit
router.post('/', async (req, res) => {
    const { name, description, type, frequency } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    // Validate type if provided
    const validTypes = ['build', 'break'];
    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type must be "build" or "break"' });
    }

    try {
        const result = await db.query(
            'INSERT INTO habits (name, description, type, frequency) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description || '', type || 'build', frequency || 'daily']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to create habit' });
    }
});

// GET /habits - Get all habits
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM habits ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

// GET /habits/stats - Get overview stats for all habits
router.get('/stats', async (req, res) => {
    try {
        // 1. Fetch all habits
        const habitsResult = await db.query('SELECT * FROM habits ORDER BY created_at DESC');
        const habits = habitsResult.rows;

        // 2. Fetch ALL check-ins needed for stats
        const checkInsResult = await db.query(
            "SELECT habit_id, to_char(date, 'YYYY-MM-DD') as date FROM check_ins ORDER BY date DESC"
        );
        const allCheckIns = checkInsResult.rows;

        // 3. Group check-ins by habit_id in memory
        const checkInsByHabit = {};
        allCheckIns.forEach(ci => {
            if (!checkInsByHabit[ci.habit_id]) {
                checkInsByHabit[ci.habit_id] = [];
            }
            checkInsByHabit[ci.habit_id].push(ci);
        });

        // 4. Calculate stats for each habit
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

        res.json(stats);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habit stats' });
    }
});

// GET /habits/:id - Get a single habit
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM habits WHERE id = $1', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch habit' });
    }
});

// PUT /habits/:id - Update a habit
router.put('/:id', async (req, res) => {
    const { name, description, type, frequency } = req.body;

    const validTypes = ['build', 'break'];
    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type must be "build" or "break"' });
    }

    try {
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
        const query = `UPDATE habits SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to update habit' });
    }
});

// DELETE /habits/:id - Delete a habit
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM habits WHERE id = $1 RETURNING id', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Check-ins are auto-deleted due to ON DELETE CASCADE
        res.status(204).send();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to delete habit' });
    }
});

// GET /habits/:id/stats - Get full stats for a habit
router.get('/:id/stats', async (req, res) => {
    const habitId = parseInt(req.params.id);

    try {
        const habitResult = await db.query('SELECT * FROM habits WHERE id = $1', [habitId]);
        if (habitResult.rows.length === 0) {
            return res.status(404).json({ error: 'Habit not found' });
        }
        const habit = habitResult.rows[0];

        // Get all check-ins for this habit
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

            // Calculate completion rate
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
