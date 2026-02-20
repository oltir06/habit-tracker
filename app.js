const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const requestLogger = require('./utils/requestLogger');
const { cleanupExpiredTokens } = require('./utils/tokens');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Habit Tracker API',
    version: '1.3',
    endpoints: {
      health: 'https://habittrackerapi.me/health',
      metrics: 'https://habittrackerapi.me/metrics',
      habits: 'https://habittrackerapi.me/habits',
      auth: '/auth',
      documentation: 'https://github.com/oltir06/habit-tracker'
    }
  });
});

// Routes
const habitsRouter = require('./routes/habits');
const checkInsRouter = require('./routes/checkIns');
const healthRouter = require('./routes/health');
const metricsRouter = require('./routes/metrics');
const authRouter = require('./routes/auth');

// Mount routes
app.use('/habits', habitsRouter);
app.use('/habits', checkInsRouter);
app.use('/health', healthRouter);
app.use('/metrics', metricsRouter);
app.use('/auth', authRouter);

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

// Cleanup expired tokens every hour
setInterval(async () => {
  await cleanupExpiredTokens();
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  logger.info(`Habit Tracker API running on port ${PORT}`);

  // Run cleanup on startup
  cleanupExpiredTokens();
});
