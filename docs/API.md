# Habit Tracker API — Full Reference

**Base URL:** `https://habittrackerapi.me`  
**Version:** 1.3.0

---

## Authentication

All habit and check-in endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Access tokens expire in **15 minutes**. Use the refresh token to get a new one.

---

## Auth Endpoints

### POST /auth/register

Register a new user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "Your Name"
}
```

**Response `201`:**
```json
{
  "user": { "id": 1, "email": "user@example.com", "name": "Your Name", "created_at": "..." },
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3..."
}
```

**Errors:** `400` email already registered | `400` validation errors

---

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "user": { "id": 1, "email": "user@example.com", "name": "Your Name", "created_at": "..." },
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3..."
}
```

**Errors:** `401` invalid email or password

---

### POST /auth/refresh

Get a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGc..."
}
```

**Errors:** `401` invalid or expired refresh token

---

### POST /auth/logout

Revoke a refresh token (logout from current device).

**Request:**
```json
{
  "refreshToken": "a1b2c3..."
}
```

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/logout-all

Revoke all refresh tokens for the current user (logout all devices).  
Requires `Authorization` header.

**Response `200`:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

---

### GET /auth/me

Get current user info. Requires `Authorization` header.

**Response `200`:**
```json
{
  "user": { "id": 1, "email": "user@example.com", "name": "Your Name", "created_at": "..." }
}
```

---

### GET /auth/google

Initiate Google OAuth2 login — returns the URL to redirect the user to.

**Response `200`:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### GET /auth/google/callback

Google OAuth2 callback. Google redirects here after login. Returns user and tokens.

**Response `200`:**
```json
{
  "user": { "id": 1, "email": "user@gmail.com", "name": "Your Name" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3..."
}
```

**Errors:** `400` missing code | `500` authentication failed

---

## Habit Endpoints

All require `Authorization: Bearer TOKEN`.

---

### POST /habits

Create a new habit.

**Request:**
```json
{
  "name": "Morning Workout",
  "type": "build",
  "description": "30 minutes every morning"
}
```

`type`: `"build"` (build a habit) or `"break"` (break a habit)

**Response `201`:**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Morning Workout",
  "type": "build",
  "description": "30 minutes every morning",
  "created_at": "..."
}
```

---

### GET /habits

Get all habits for the authenticated user.

**Response `200`:**
```json
[
  { "id": 1, "name": "Morning Workout", "type": "build", ... }
]
```

---

### GET /habits/:id

Get a specific habit by ID.

**Response `200`:** habit object  
**Errors:** `404` not found

---

### PUT /habits/:id

Update a habit.

**Request:** any combination of `name`, `description`, `type`

**Response `200`:** updated habit object  
**Errors:** `404` not found

---

### DELETE /habits/:id

Delete a habit (and all its check-ins).

**Response `200`:** `{ "message": "Habit deleted" }`  
**Errors:** `404` not found

---

### GET /habits/stats

Get stats overview for all user's habits.

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Morning Workout",
    "currentStreak": 5,
    "longestStreak": 12,
    "totalCheckIns": 30,
    "completionRate": 0.85
  }
]
```

---

## Check-in Endpoints

All require `Authorization: Bearer TOKEN`.

---

### POST /habits/:id/checkin

Check in for today (one per day per habit).

**Response `201`:**
```json
{
  "id": 1,
  "habit_id": 1,
  "date": "2026-02-20",
  "created_at": "..."
}
```

**Errors:** `409` already checked in today | `404` habit not found

---

### GET /habits/:id/checkins

Get check-in history for a habit.

**Response `200`:**
```json
[
  { "id": 1, "habit_id": 1, "date": "2026-02-20", "created_at": "..." }
]
```

---

### GET /habits/:id/streak

Get current and longest streak.

**Response `200`:**
```json
{
  "currentStreak": 5,
  "longestStreak": 12
}
```

---

### GET /habits/:id/stats

Get detailed stats for a single habit.

**Response `200`:**
```json
{
  "id": 1,
  "name": "Morning Workout",
  "currentStreak": 5,
  "longestStreak": 12,
  "totalCheckIns": 30,
  "completionRate": 0.85,
  "firstCheckIn": "2026-01-01",
  "lastCheckIn": "2026-02-20"
}
```

---

## System Endpoints

### GET /

API info and available endpoints. No auth required.

### GET /health

Health check — returns database status, memory usage, and uptime. No auth required.

### GET /metrics

Application metrics (request counts, error rates). No auth required.

---

## Error Format

All errors return JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Validation errors:
```json
{
  "errors": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Unauthorized (missing or invalid token) |
| `404` | Not found |
| `409` | Conflict (e.g. duplicate check-in) |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |