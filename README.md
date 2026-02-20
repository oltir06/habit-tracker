# Habit Tracker API

REST API for tracking daily habits and streaks. I built this to get more comfortable with backend development, working with databases, and deploying to AWS.

[![API Status](https://img.shields.io/website?url=https%3A%2F%2Fhabittrackerapi.me)](https://habittrackerapi.me)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🔗 **Live API:** https://habittrackerapi.me  
📊 **Health Check:** https://habittrackerapi.me/health  
📈 **Metrics:** https://habittrackerapi.me/metrics

## Tech Stack

- Node.js + Express
- PostgreSQL (hosted on AWS RDS)
- Docker
- Nginx (reverse proxy, rate limiting)
- AWS EC2 + RDS
- Let's Encrypt SSL
- Winston logging + CloudWatch
- UptimeRobot monitoring

## What it does

- User registration and login with email/password
- Google OAuth2 social login
- JWT-based authentication (access + refresh tokens)
- Create and manage habits (things you want to build or break)
- Check in daily to track progress
- Calculates current and longest streaks automatically
- Stats endpoint with completion rates and totals
- Prevents duplicate check-ins for the same day
- Health check with database and memory status
- Application metrics endpoint
- Structured JSON logging to CloudWatch
- HTTPS with auto-renewed SSL certificates
- Rate limiting (100 req/min per IP)

## 🔐 Authentication

### Register
```bash
curl -X POST https://habittrackerapi.me/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "Your Name"
  }'
```

### Login
```bash
curl -X POST https://habittrackerapi.me/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Using Access Token
```bash
curl https://habittrackerapi.me/habits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST https://habittrackerapi.me/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Logout
```bash
curl -X POST https://habittrackerapi.me/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Google OAuth
```bash
# Step 1: Get auth URL
curl https://habittrackerapi.me/auth/google

# Step 2: Open the returned authUrl in browser, login with Google
# Step 3: You'll receive user + tokens in the callback response
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login with email/password | No |
| `POST` | `/auth/refresh` | Refresh access token | No |
| `POST` | `/auth/logout` | Logout (revoke refresh token) | No |
| `POST` | `/auth/logout-all` | Logout all devices | Yes |
| `GET` | `/auth/me` | Get current user info | Yes |
| `GET` | `/auth/google` | Initiate Google OAuth | No |
| `GET` | `/auth/google/callback` | Google OAuth callback | No |

### Habits

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | API info and available endpoints |
| `GET` | `/health` | Health check (database, memory, uptime) |
| `GET` | `/metrics` | Application metrics |
| `POST` | `/habits` | Create a new habit |
| `GET` | `/habits` | List all habits |
| `GET` | `/habits/:id` | Get a specific habit |
| `PUT` | `/habits/:id` | Update a habit |
| `DELETE` | `/habits/:id` | Delete a habit (cascades to check-ins) |
| `POST` | `/habits/:id/checkin` | Check in for today |
| `GET` | `/habits/:id/checkins` | Get check-in history |
| `GET` | `/habits/:id/streak` | Get current and longest streak |
| `GET` | `/habits/:id/stats` | Get stats for one habit |
| `GET` | `/habits/stats` | Get stats overview for all habits |

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'build',
  frequency VARCHAR(50) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE check_ins (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(habit_id, date)
);
```

## Project Structure

```
├── app.js                  # Express app setup
├── Dockerfile
├── docker-compose.yml
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── habits.js           # Habit CRUD endpoints
│   ├── checkIns.js         # Check-in endpoints
│   ├── health.js           # Health monitoring
│   └── metrics.js          # Metrics endpoint
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── db/
│   └── db.js               # PostgreSQL connection
├── utils/
│   ├── logger.js           # Winston logger setup
│   ├── requestLogger.js    # Request logging middleware
│   ├── streak.js           # Streak calculation logic
│   ├── tokens.js           # JWT token utilities
│   └── googleOAuth.js      # Google OAuth2 helper
└── docs/
    ├── API.md
    ├── schema.sql
    └── nginx.conf
```

## Running Locally

You need Node.js 18+ and a PostgreSQL database.

```bash
git clone https://github.com/oltir06/habit-tracker-api.git
cd habit-tracker-api
npm install
```

Create a `.env` file (see `.env.example`):

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/habits
NODE_ENV=development
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Run the schema from `docs/schema.sql` against your database, then:

```bash
npm start
```

The API runs at `http://localhost:3000`.

### Docker

```bash
docker build -t habit-tracker .
docker run -p 3000:3000 --env-file .env habit-tracker
```

## Deployment

Running on an EC2 t3.micro instance with an RDS PostgreSQL database (db.t4g.micro). The app runs in a Docker container behind Nginx as a reverse proxy, with SSL from Let's Encrypt.

- Domain: habittrackerapi.me
- Nginx handles SSL termination, rate limiting, and security headers
- Logs go to CloudWatch as structured JSON
- UptimeRobot checks `/health` every 5 minutes with email alerts on downtime

## Security

- HTTPS everywhere via Let's Encrypt
- JWT access tokens (15 min expiration) + refresh tokens (7 days, revocable)
- Bcrypt password hashing (10 rounds)
- Rate limiting at 100 requests/minute per IP
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- Parameterized SQL queries (no SQL injection)
- Users can only access their own data
- Docker container runs as non-root user

## License

MIT

## 👤 Author

Built as a portfolio project to demonstrate production-ready API development and cloud deployment skills.

**GitHub:** https://github.com/oltir06/habit-tracker