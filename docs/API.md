# API Documentation

Complete reference for Habit Tracker API endpoints.

**Base URL:** `https://habittrackerapi.me`

---

## Authentication

Currently no authentication required.

---

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable (unhealthy) |

---

## Endpoints

### System Endpoints

#### GET /
Get API information and available endpoints.

**Response:**
```json
{
  "name": "Habit Tracker API",
  "version": "1.1",
  "endpoints": {
    "health": "/health",
    "metrics": "/metrics",
    "habits": "/habits",
    "documentation": "https://github.com/oltir06/habit-tracker-api"
  }
}
```

#### GET /health
Comprehensive health check.

**Response:** See main README for full example

#### GET /metrics
Application and system metrics.

**Response:**
```json
{
  "process_uptime_seconds": 3245.67,
  "process_memory_heap_used_bytes": 47185920,
  "process_memory_heap_total_bytes": 134217728,
  "habits_total": 5,
  "check_ins_total": 127,
  "nodejs_version": "v18.20.8",
  "environment": "production"
}
```

---

### Habit Endpoints

#### POST /habits
Create a new habit.

**Request Body:**
```json
{
  "name": "Morning Workout",
  "description": "30 minutes of exercise",
  "type": "build",
  "frequency": "daily"
}
```

**Fields:**
- `name` (required): Habit name
- `description` (optional): Habit description
- `type` (optional): "build" or "break" (default: "build")
- `frequency` (optional): "daily", "weekly", etc. (default: "daily")

**Response (201):**
```json
{
  "id": 1,
  "name": "Morning Workout",
  "description": "30 minutes of exercise",
  "type": "build",
  "frequency": "daily",
  "created_at": "2026-02-09T20:00:00.000Z"
}
```

#### GET /habits
List all habits.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Morning Workout",
    "description": "30 minutes of exercise",
    "type": "build",
    "frequency": "daily",
    "created_at": "2026-02-09T20:00:00.000Z"
  }
]
```

#### GET /habits/:id
Get a single habit.

**Parameters:**
- `id`: Habit ID

**Response (200):** Same as single habit object above

**Errors:**
- 404: Habit not found

#### PUT /habits/:id
Update a habit.

**Parameters:**
- `id`: Habit ID

**Request Body (all fields optional):**
```json
{
  "name": "Evening Workout",
  "description": "Updated description",
  "type": "build",
  "frequency": "daily"
}
```

**Response (200):** Updated habit object

#### DELETE /habits/:id
Delete a habit and all its check-ins.

**Parameters:**
- `id`: Habit ID

**Response (204):** No content

---

### Check-in Endpoints

#### POST /habits/:id/checkin
Mark habit as complete today.

**Parameters:**
- `id`: Habit ID

**Response (201):**
```json
{
  "message": "Check-in successful!",
  "checkIn": {
    "id": 15,
    "habit_id": 1,
    "date": "2026-02-09",
    "created_at": "2026-02-09T20:15:00.000Z"
  }
}
```

**Errors:**
- 400: Already checked in today
- 404: Habit not found

#### GET /habits/:id/checkins
Get check-in history for a habit.

**Parameters:**
- `id`: Habit ID

**Response (200):**
```json
[
  {
    "id": 15,
    "habit_id": 1,
    "date": "2026-02-09",
    "created_at": "2026-02-09T20:15:00.000Z"
  },
  {
    "id": 14,
    "habit_id": 1,
    "date": "2026-02-08",
    "created_at": "2026-02-08T21:00:00.000Z"
  }
]
```

---

### Analytics Endpoints

#### GET /habits/:id/streak
Get current and longest streak for a habit.

**Parameters:**
- `id`: Habit ID

**Response (200):**
```json
{
  "habitId": 1,
  "currentStreak": 7,
  "longestStreak": 15
}
```

#### GET /habits/:id/stats
Get detailed statistics for a habit.

**Parameters:**
- `id`: Habit ID

**Response (200):**
```json
{
  "habitId": 1,
  "name": "Morning Workout",
  "type": "build",
  "totalCheckIns": 45,
  "currentStreak": 7,
  "longestStreak": 15,
  "completionRate": 0.85,
  "firstCheckIn": "2026-01-01",
  "lastCheckIn": "2026-02-09"
}
```

#### GET /habits/stats
Get overview statistics for all habits.

**Response (200):**
```json
[
  {
    "habitId": 1,
    "name": "Morning Workout",
    "currentStreak": 7,
    "longestStreak": 15
  },
  {
    "habitId": 2,
    "name": "Reading",
    "currentStreak": 3,
    "longestStreak": 10
  }
]
```

---

## Rate Limiting

- **Limit:** 100 requests per minute per IP
- **Health endpoint:** 200 requests per minute
- **Burst:** 20 requests allowed temporarily
- **Response:** 503 Service Unavailable when rate limited

---

## Examples

### Create and Track a Habit
```bash
# 1. Create habit
curl -X POST https://habittrackerapi.me/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Daily Reading","type":"build"}'

# 2. Check in today
curl -X POST https://habittrackerapi.me/habits/1/checkin

# 3. View streak
curl https://habittrackerapi.me/habits/1/streak

# 4. Get full stats
curl https://habittrackerapi.me/habits/1/stats
```

---

## Errors

All errors return JSON:
```json
{
  "error": "Error message description"
}
```

Common errors:
- "Name is required"
- "Habit not found"
- "Already checked in today"
- "Type must be 'build' or 'break'"