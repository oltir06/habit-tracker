const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Database connection
const db = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Calculate streak info
const calculateStreak = async (habitId) => {
  try {
    const result = await db.query(
      'SELECT date FROM check_ins WHERE habit_id = $1 ORDER BY date DESC',
      [habitId]
    );

    const habitCheckIns = result.rows;

    if (habitCheckIns.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    let currentStreak = 0;
    let checkDate = new Date(today);

    // Calculate current streak
    const todayCheckIn = habitCheckIns.find(c => c.date === today);

    if (todayCheckIn) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasCheckIn = habitCheckIns.find(c => c.date === dateStr);

        if (hasCheckIn) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentRun = 0;

    const sortedCheckIns = [...habitCheckIns].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedCheckIns.length > 0) {
      currentRun = 1;
      longestStreak = 1;

      for (let i = 1; i < sortedCheckIns.length; i++) {
        const prevDate = new Date(sortedCheckIns[i - 1].date);
        const currDate = new Date(sortedCheckIns[i].date);

        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentRun++;
        } else if (diffDays > 1) {
          currentRun = 1;
        }

        longestStreak = Math.max(longestStreak, currentRun);
      }
    }

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Streak calculation error:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
};

// POST /habits - Create a new habit
app.post('/habits', async (req, res) => {
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
app.get('/habits', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM habits ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// GET /habits/stats - Get overview stats for all habits
app.get('/habits/stats', async (req, res) => {
  try {
    const habitsResult = await db.query('SELECT * FROM habits');

    const stats = await Promise.all(
      habitsResult.rows.map(async (habit) => {
        const streakInfo = await calculateStreak(habit.id);
        return {
          habitId: habit.id,
          name: habit.name,
          currentStreak: streakInfo.currentStreak,
          longestStreak: streakInfo.longestStreak
        };
      })
    );

    res.json(stats);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /habits/:id - Get a single habit
app.get('/habits/:id', async (req, res) => {
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
app.put('/habits/:id', async (req, res) => {
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
app.delete('/habits/:id', async (req, res) => {
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

// POST /habits/:id/checkin - Mark habit done today
app.post('/habits/:id/checkin', async (req, res) => {
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
app.get('/habits/:id/checkins', async (req, res) => {
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
app.get('/habits/:id/streak', async (req, res) => {
  const habitId = parseInt(req.params.id);

  try {
    const habitCheck = await db.query('SELECT id FROM habits WHERE id = $1', [habitId]);
    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const streakInfo = await calculateStreak(habitId);

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

// GET /habits/:id/stats - Get full stats for a habit
app.get('/habits/:id/stats', async (req, res) => {
  const habitId = parseInt(req.params.id);

  try {
    const habitResult = await db.query('SELECT * FROM habits WHERE id = $1', [habitId]);
    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    const habit = habitResult.rows[0];

    const streakInfo = await calculateStreak(habitId);

    // Get all check-ins for this habit
    const checkInsResult = await db.query(
      "SELECT to_char(date, 'YYYY-MM-DD') as date FROM check_ins WHERE habit_id = $1 ORDER BY date ASC",
      [habitId]
    );
    const habitCheckIns = checkInsResult.rows;
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

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
