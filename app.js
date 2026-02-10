const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const requestLogger = require('./utils/requestLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Add request logging

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Habit Tracker API',
    version: '1.2',
    endpoints: {
      health: 'https://habittrackerapi.me/health',
      metrics: 'https://habittrackerapi.me/metrics',
      habits: 'https://habittrackerapi.me/habits',
      documentation: 'https://github.com/oltir06/habit-tracker'
    }
  });
});

// Routes
const habitsRouter = require('./routes/habits');
const checkInsRouter = require('./routes/checkIns');
const healthRouter = require('./routes/health');
const metricsRouter = require('./routes/metrics');

// Mount routes
app.use('/habits', habitsRouter);
app.use('/habits', checkInsRouter);
app.use('/health', healthRouter);
app.use('/metrics', metricsRouter);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Habit Tracker API running on port ${PORT}`);
});
