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

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
