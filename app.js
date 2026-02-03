const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (temporary until we add database)
let habits = [];
let nextId = 1;

// Check-in storage
let checkIns = [];
let checkInIdCounter = 1;

// Helper: Calculate streak info
const calculateStreak = (habitId) => {
  const habitCheckIns = checkIns
    .filter(c => c.habitId === habitId)
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

  if (habitCheckIns.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  let checkDate = new Date(today);

  // Calculate current streak
  // Check if today is checked in
  const todayCheckIn = habitCheckIns.find(c => c.date === today);

  if (todayCheckIn) {
    currentStreak = 1;
    checkDate.setDate(checkDate.getDate() - 1); // Move to yesterday

    // Check consecutive days backwards
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

  // Sort oldest first for single pass calculation
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
      // If diffDays === 0 (same day), do nothing (keep current run)

      longestStreak = Math.max(longestStreak, currentRun);
    }
  }

  return { currentStreak, longestStreak };
};

// POST /habits - Create a new habit
app.post('/habits', (req, res) => {
  const { name, description, type, frequency } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate type if provided
  const validTypes = ['build', 'break'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Type must be "build" or "break"' });
  }

  const habit = {
    id: nextId++,
    name,
    description: description || '',
    type: type || 'build',
    frequency: frequency || 'daily',
    createdAt: new Date().toISOString()
  };

  habits.push(habit);
  res.status(201).json(habit);
});

// GET /habits - List all habits
app.get('/habits', (req, res) => {
  res.json(habits);
});

// GET /habits/stats - Get overview stats for all habits
app.get('/habits/stats', (req, res) => {
  const stats = habits.map(habit => {
    const streakInfo = calculateStreak(habit.id);
    return {
      habitId: habit.id,
      name: habit.name,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak
    };
  });

  res.json(stats);
});

// GET /habits/:id - Get a single habit
app.get('/habits/:id', (req, res) => {
  const habit = habits.find(h => h.id === parseInt(req.params.id));

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  res.json(habit);
});

// PUT /habits/:id - Update a habit
app.put('/habits/:id', (req, res) => {
  const habit = habits.find(h => h.id === parseInt(req.params.id));

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const { name, description, type, frequency } = req.body;

  // Validate type if provided
  const validTypes = ['build', 'break'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Type must be "build" or "break"' });
  }

  if (name) habit.name = name;
  if (description !== undefined) habit.description = description;
  if (type) habit.type = type;
  if (frequency) habit.frequency = frequency;

  res.json(habit);
});

// DELETE /habits/:id - Delete a habit
app.delete('/habits/:id', (req, res) => {
  const habitId = parseInt(req.params.id);
  const index = habits.findIndex(h => h.id === habitId);

  if (index === -1) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  // Remove orphaned check-ins for this habit
  checkIns = checkIns.filter(c => c.habitId !== habitId);

  habits.splice(index, 1);
  res.status(204).send();
});

// POST /habits/:id/checkin - Mark habit done today
app.post('/habits/:id/checkin', (req, res) => {
  const habitId = parseInt(req.params.id);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const existingCheckIn = checkIns.find(
    c => c.habitId === habitId && c.date === today
  );

  if (existingCheckIn) {
    return res.status(400).json({ error: 'Already checked in today' });
  }

  // Create new check-in
  const checkIn = {
    id: checkInIdCounter++,
    habitId: habitId,
    date: today,
    createdAt: new Date().toISOString()
  };

  checkIns.push(checkIn);
  res.status(201).json({
    message: 'Check-in successful!',
    checkIn: checkIn
  });
});

// GET /habits/:id/checkins - Get check-in history for a habit
app.get('/habits/:id/checkins', (req, res) => {
  const habitId = parseInt(req.params.id);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  // Get all check-ins for this habit, sorted by date (newest first)
  const habitCheckIns = checkIns
    .filter(c => c.habitId === habitId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(habitCheckIns);
});

// GET /habits/:id/streak - Get streak info
app.get('/habits/:id/streak', (req, res) => {
  const habitId = parseInt(req.params.id);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const streakInfo = calculateStreak(habitId);

  res.json({
    habitId: habitId,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak
  });
});

// GET /habits/:id/stats - Get full stats for a habit
app.get('/habits/:id/stats', (req, res) => {
  const habitId = parseInt(req.params.id);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const streakInfo = calculateStreak(habitId);

  // Get all check-ins for this habit
  const habitCheckIns = checkIns.filter(c => c.habitId === habitId);
  const totalCheckIns = habitCheckIns.length;

  let firstCheckIn = null;
  let lastCheckIn = null;
  let completionRate = 0;

  if (totalCheckIns > 0) {
    // Sort oldest first to get dates
    const sortedCheckIns = [...habitCheckIns].sort((a, b) => new Date(a.date) - new Date(b.date));
    firstCheckIn = sortedCheckIns[0].date;
    lastCheckIn = sortedCheckIns[sortedCheckIns.length - 1].date;

    // Calculate completion rate
    const today = new Date();
    const firstCheckInDate = new Date(firstCheckIn);

    // Reset time components to ensure day calculation is accurate relative to dates
    today.setHours(0, 0, 0, 0);
    // Normalize both dates to midnight for accurate day difference calculation
    firstCheckInDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today - firstCheckInDate);
    const daysSinceFirst = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include first day

    completionRate = totalCheckIns / daysSinceFirst;
    // Cap at 1.0 just in case future-proofing issues or timezone weirdness
    if (completionRate > 1) completionRate = 1;
    // Round to 2 decimal places
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
});

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
