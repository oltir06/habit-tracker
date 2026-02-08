const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Routes
const habitsRouter = require('./routes/habits');
const checkInsRouter = require('./routes/checkIns');

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/habits', habitsRouter);
app.use('/habits', checkInsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
