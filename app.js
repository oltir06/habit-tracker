const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({
    name: 'Habit Tracker API',
    version: '1.1',
    endpoints: {
      health: '/health',
      habits: '/habits',
      documentation: 'https://github.com/oltir06/habit-tracker'
    }
  });
});

// Routes
const habitsRouter = require('./routes/habits');
const checkInsRouter = require('./routes/checkIns');
const healthRouter = require('./routes/health');

// Mount routes
app.use('/habits', habitsRouter);
app.use('/habits', checkInsRouter);
app.use('/health', healthRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Habit Tracker API running on http://localhost:${PORT}`);
});
