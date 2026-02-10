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

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | API info and available endpoints |
| GET | `/health` | Health check (database, memory, uptime) |
| GET | `/metrics` | Application metrics |
| POST | `/habits` | Create a new habit |
| GET | `/habits` | List all habits |
| GET | `/habits/:id` | Get a specific habit |
| PUT | `/habits/:id` | Update a habit |
| DELETE | `/habits/:id` | Delete a habit (cascades to check-ins) |
| POST | `/habits/:id/checkin` | Check in for today |
| GET | `/habits/:id/checkins` | Get check-in history |
| GET | `/habits/:id/streak` | Get current and longest streak |
| GET | `/habits/:id/stats` | Get stats for one habit |
| GET | `/habits/stats` | Get stats overview for all habits |

## Database Schema

```sql
CREATE TABLE habits (
  id SERIAL PRIMARY KEY,
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
│   ├── habits.js           # Habit CRUD endpoints
│   ├── checkIns.js         # Check-in endpoints
│   ├── health.js           # Health monitoring
│   └── metrics.js          # Metrics endpoint
├── db/
│   └── db.js               # PostgreSQL connection
├── utils/
│   ├── logger.js           # Winston logger setup
│   ├── requestLogger.js    # Request logging middleware
│   └── streak.js           # Streak calculation logic
└── docs/
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

Create a `.env` file:

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/habits
NODE_ENV=development
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

## Quick Example

```bash
# create a habit
curl -X POST http://localhost:3000/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Morning Workout","type":"build"}'

# check in
curl -X POST http://localhost:3000/habits/1/checkin

# see your streak
curl http://localhost:3000/habits/1/streak
```

## Deployment

Running on an EC2 t3.micro instance with an RDS PostgreSQL database (db.t4g.micro). The app runs in a Docker container behind Nginx as a reverse proxy, with SSL from Let's Encrypt.

- Domain: habittrackerapi.me
- Nginx handles SSL termination, rate limiting, and security headers
- Logs go to CloudWatch as structured JSON
- UptimeRobot checks `/health` every 5 minutes with email alerts on downtime

## Security

- HTTPS everywhere via Let's Encrypt
- Rate limiting at 100 requests/minute per IP
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- Parameterized SQL queries
- Docker container runs as non-root user

## License

MIT

## 👤 Author

Built as a portfolio project to demonstrate production-ready API development and cloud deployment skills.

**GitHub:** https://github.com/oltir06/habit-tracker-api