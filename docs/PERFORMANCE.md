# Performance Optimization - Redis Caching

## Overview

Redis caching layer for the Habit Tracker API, reducing response times and database load.

## Benchmarks

Tested on EC2 t3.micro, Node.js v22.22.0, PostgreSQL on RDS.

### Without Cache (First Request)
| Endpoint | Response Time | DB Queries |
|----------|--------------|------------|
| GET /habits | 4-7ms | 1 |
| GET /habits/stats | 5-11ms | 2 |

### With Cache (Second Request)
| Endpoint | Response Time | Improvement |
|----------|--------------|-------------|
| GET /habits | 2-4ms | ~1.8x faster |
| GET /habits/stats | 2-5ms | ~2.2x faster |

> **Note:** Improvements are modest with a small dataset (1-2 habits). The gap widens significantly with more data, as DB queries scale with record count while cache lookups stay constant.

### Sustained Load (100 Requests)
- Total time: 325ms
- Average: 3.25ms per request
- Cache hit rate: 99.06%

## Cache Strategy

### TTL Configuration
- Habits list: 5 minutes
- Stats/analytics: 5 minutes
- Streaks: 5 minutes
- Check-ins: 10 minutes

### Invalidation Rules
1. **Create habit** → Invalidate user's habits list + stats
2. **Update habit** → Invalidate user's habits + specific habit
3. **Delete habit** → Invalidate user's habits + specific habit
4. **Check-in** → Invalidate habit's streak + stats + check-ins

### Key Patterns
```
user:{userId}:habits
user:{userId}:habits:stats
streak:user:{userId}:habit:{habitId}
habit-stats:user:{userId}:habit:{habitId}
checkins:user:{userId}:habit:{habitId}
```

## Infrastructure

**Redis Configuration:**
- Version: 7.x
- Memory usage: ~1.12MB
- Eviction: allkeys-lru
- Persistence: RDB snapshots

**Monitoring:**
- Cache hits/misses tracked via `/metrics`
- Health check via `/health` (includes Redis status)
- Detailed stats via `/cache/stats`
- Cache hit rate: 97-99% under sustained load
