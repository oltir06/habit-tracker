# Habit Tracker API

REST API for tracking daily habits and streaks. I built this to get more comfortable with backend development, working with databases, and deploying to AWS.

## Tech Stack

- Node.js + Express
- PostgreSQL (hosted on AWS RDS)
- Docker
- Deployed on AWS EC2

## What it does

- Create and manage habits (things you want to build or break)
- Check in daily to track progress
- Calculates current and longest streaks automatically
- Stats endpoint with completion rates and totals
- Prevents duplicate check-ins for the same day

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | API + database health check |
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
```

Run the schema SQL above against your database, then:

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

Running on an EC2 t3.micro instance with an RDS PostgreSQL database. The app runs in a Docker container on EC2 with security groups set up for HTTP access.

## License

MIT
