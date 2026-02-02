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

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
