const client = require('prom-client');
const logger = require('./logger');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'habit_tracker_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});
register.registerMetric(httpRequestDuration);

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'habit_tracker_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestsTotal);

// Active requests gauge
const httpRequestsActive = new client.Gauge({
  name: 'habit_tracker_http_requests_active',
  help: 'Number of active HTTP requests'
});
register.registerMetric(httpRequestsActive);

// Cache metrics
const cacheHits = new client.Counter({
  name: 'habit_tracker_cache_hits_total',
  help: 'Total number of cache hits'
});
register.registerMetric(cacheHits);

const cacheMisses = new client.Counter({
  name: 'habit_tracker_cache_misses_total',
  help: 'Total number of cache misses'
});
register.registerMetric(cacheMisses);

const cacheHitRate = new client.Gauge({
  name: 'habit_tracker_cache_hit_rate',
  help: 'Cache hit rate (0-1)'
});
register.registerMetric(cacheHitRate);

// Database connection pool
const dbConnectionsActive = new client.Gauge({
  name: 'habit_tracker_db_connections_active',
  help: 'Number of active database connections'
});
register.registerMetric(dbConnectionsActive);

const dbConnectionsMax = new client.Gauge({
  name: 'habit_tracker_db_connections_max',
  help: 'Maximum number of database connections',
  async collect() {
    this.set(20); // pg pool default
  }
});
register.registerMetric(dbConnectionsMax);

const dbQueryDuration = new client.Histogram({
  name: 'habit_tracker_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});
register.registerMetric(dbQueryDuration);

// Business metrics
const usersTotal = new client.Gauge({
  name: 'habit_tracker_users_total',
  help: 'Total number of registered users'
});
register.registerMetric(usersTotal);

const habitsTotal = new client.Gauge({
  name: 'habit_tracker_habits_total',
  help: 'Total number of habits'
});
register.registerMetric(habitsTotal);

const checkInsTotal = new client.Gauge({
  name: 'habit_tracker_checkins_total',
  help: 'Total number of check-ins'
});
register.registerMetric(checkInsTotal);

const checkInsToday = new client.Gauge({
  name: 'habit_tracker_checkins_today',
  help: 'Number of check-ins today'
});
register.registerMetric(checkInsToday);

// Export metrics and functions
module.exports = {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsActive,
  cacheHits,
  cacheMisses,
  cacheHitRate,
  dbConnectionsActive,
  dbQueryDuration,
  usersTotal,
  habitsTotal,
  checkInsTotal,
  checkInsToday
};
