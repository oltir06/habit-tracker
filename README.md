# Habit Tracker API

![Test Status](https://github.com/oltir06/habit-tracker/actions/workflows/test.yml/badge.svg)
![Build Status](https://github.com/oltir06/habit-tracker/actions/workflows/build.yml/badge.svg)
![Deployment Status](https://github.com/oltir06/habit-tracker/actions/workflows/deploy.yml/badge.svg)
[![API Status](https://img.shields.io/website?url=https%3A%2F%2Fhabittrackerapi.me)](https://habittrackerapi.me)

Production-ready REST API for tracking daily habits and streaks. Built with a full DevOps pipeline — containerized, deployed to AWS, monitored with Prometheus + Grafana, and managed with Terraform.

🔗 **Live API:** https://habittrackerapi.me  
📊 **Health Check:** https://habittrackerapi.me/health  
📈 **Metrics:** https://habittrackerapi.me/metrics  
📉 **Grafana:** https://habittrackerapi.me/grafana/  
📚 **API Docs:** [docs/API.md](docs/API.md)

## Performance

| Metric | Value |
|--------|-------|
| Response Time (cached) | 2-5ms |
| Response Time (uncached) | ~30ms |
| Cache Hit Rate | 85-99% |
| Database Query Reduction | 80% |
| Uptime | 99.9% |
| Peak Load Tested | 1,000+ req/min |

## Tech Stack

- Node.js + Express
- PostgreSQL (hosted on AWS RDS)
- Redis (caching layer)
- Docker
- Nginx (reverse proxy, rate limiting)
- AWS EC2 + RDS
- Let's Encrypt SSL
- Winston logging + CloudWatch
- Prometheus + Grafana (metrics & dashboards)
- Alertmanager (alerting)
- UptimeRobot monitoring

## What it does

**Authentication**
- User registration and login with email/password
- Google OAuth2 social login
- JWT-based authentication (access + refresh tokens)

**Habits & Tracking**
- Create and manage habits (things you want to build or break)
- Check in daily to track progress
- Calculates current and longest streaks automatically
- Stats endpoint with completion rates and totals
- Prevents duplicate check-ins for the same day

**Performance**
- Redis caching layer with cache warming
- Cache monitoring and management endpoints

**Operations**
- Health check (database, cache, memory)
- Application metrics endpoint (JSON + Prometheus format)
- Prometheus scraping every 15s with custom business metrics
- Grafana dashboards for API, Redis, and system metrics
- Alertmanager with email alerts (APIDown, LowDiskSpace, HighErrorRate)
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

### System

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `GET` | `/` | API info and available endpoints | No |
| `GET` | `/health` | Health check (database, cache, memory) | No |
| `GET` | `/metrics` | Application metrics (JSON) | No |
| `GET` | `/metrics/prometheus` | Prometheus-format metrics | No |

### Habits

All habit endpoints require authentication.

| Method | Route | Description |
|--------|-------|-------------|
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

### Cache Management

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `GET` | `/cache/stats` | Detailed cache statistics | Yes |
| `POST` | `/cache/clear` | Clear all cache | Yes |
| `DELETE` | `/cache/user/:userId` | Clear your own cache | Yes |

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

## Performance & Caching

### Redis Cache Layer

The API implements intelligent caching for improved read performance.

**Benchmarks** (EC2 t3.micro):
- Cached response time: 2-5ms
- Sustained load: 3.25ms avg over 100 requests
- Cache hit rate: 97-99% under load

**Cached Endpoints:**
```bash
GET /habits                    # 5 min TTL
GET /habits/stats              # 5 min TTL
GET /habits/:id/stats          # 5 min TTL
GET /habits/:id/streak         # 5 min TTL
GET /habits/:id/checkins       # 10 min TTL
```

**Cache Invalidation:**
- Creating/updating/deleting habits → Clear user's cache
- Checking in → Clear habit-specific cache
- Smart pattern-based invalidation

**Cache Monitoring:**
```bash
# View cache statistics
curl https://habittrackerapi.me/metrics | jq '{
  cache_connected,
  cache_hits,
  cache_misses,
  cache_hit_rate
}'

# Health check includes cache status
curl https://habittrackerapi.me/health
```

## Project Structure

```
├── app.js                   # Express app setup
├── Dockerfile
├── docker-compose.yml
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── habits.js            # Habit CRUD endpoints
│   ├── checkIns.js          # Check-in endpoints
│   ├── health.js            # Health check (DB, Redis, memory)
│   ├── metrics.js           # JSON + Prometheus metrics
│   └── cache.js             # Cache management
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── cache.js             # Cache middleware + invalidation
├── db/
│   ├── db.js                # PostgreSQL connection
│   └── redis.js             # Redis connection
├── utils/
│   ├── cache.js             # Cache utility
│   ├── metrics.js           # prom-client metric definitions
│   ├── cacheWarming.js      # Cache warming
│   ├── cacheTTL.js          # TTL configuration
│   ├── cacheKeys.js         # Cache key generator
│   ├── logger.js            # Winston logger
│   ├── requestLogger.js     # Request logging
│   ├── streak.js            # Streak calculation
│   ├── tokens.js            # JWT token utilities
│   └── googleOAuth.js       # Google OAuth2
├── monitoring/
│   ├── docker-compose.yml   # Prometheus, Grafana, Alertmanager, exporters
│   ├── prometheus/
│   │   ├── prometheus.yml   # Scrape config
│   │   └── alerts.yml       # Alert rules
│   ├── grafana/
│   │   ├── provisioning/    # Auto-provisioned datasources & dashboards
│   │   └── dashboards/      # Dashboard JSON files
│   └── alertmanager/
│       └── alertmanager.yml # Alert routing & email config
├── scripts/
│   ├── loadTest.js          # Load testing
│   └── performanceReport.sh # Performance report
└── docs/
    ├── API.md
    ├── PERFORMANCE.md        # Caching benchmarks
    ├── schema.sql
    └── nginx.conf
```

## Running Locally

You need Node.js 18+ and a PostgreSQL database.

```bash
git clone https://github.com/oltir06/habit-tracker.git
cd habit-tracker
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
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
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
- Prometheus scrapes metrics every 15s; Grafana dashboards available at `/grafana`
- Alertmanager sends email alerts for critical events (API down, high error rate, low disk)

### CI/CD Pipeline

```
Push to main
    ↓
GitHub Actions
    ↓
Run Tests (Jest)
    ↓
Build Docker Image
    ↓
Push to Docker Hub
    ↓
Deploy to EC2
    ↓
Health Check
    ↓
Production Live
```

### Terraform (Infrastructure as Code)

AWS infrastructure is fully managed with Terraform — VPC, EC2, RDS, security groups, and Elastic IP.

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Modules: `vpc`, `ec2`, `rds`, `security`

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