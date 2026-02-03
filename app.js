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

// POST /habits - Create a new habit
app.post('/habits', (req, res) => {
  const { name, description, frequency } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const habit = {
    id: nextId++,
    name,
    description: description || '',
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

  const { name, description, frequency } = req.body;

  if (name) habit.name = name;
  if (description !== undefined) habit.description = description;
  if (frequency) habit.frequency = frequency;

  res.json(habit);
});

// DELETE /habits/:id - Delete a habit
app.delete('/habits/:id', (req, res) => {
  const index = habits.findIndex(h => h.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Habit not found' });
  }

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

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
