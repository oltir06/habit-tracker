# CI/CD Pipeline Documentation

## Overview

Automated testing, building, and deployment using GitHub Actions.

## Workflows

### 1. Test (`test.yml`)
**Trigger:** Push or PR to dev/main
**Steps:**
- Checkout code
- Setup Node.js 18
- Install dependencies
- Setup PostgreSQL & Redis services
- Run tests
- Upload coverage report

### 2. Build (`build.yml`)
**Trigger:** Push to main or version tags
**Steps:**
- Build Docker image
- Push to Docker Hub
- Tag with version/branch name

### 3. Deploy (`deploy.yml`)
**Trigger:** Push to main or manual
**Steps:**
- SSH to EC2
- Pull latest code
- Pull Docker image
- Stop old container
- Start new container
- Health check

### 4. Rollback (`rollback.yml`)
**Trigger:** Manual with version input
**Steps:**
- SSH to EC2
- Checkout specified version
- Pull version image
- Restart with old version

### 5. PR Checks (`pr-check.yml`)
**Trigger:** Pull request
**Steps:**
- Lint code
- Run tests
- Security audit
- Test Docker build

### 6. Health Check (`health-check.yml`)
**Trigger:** Every 6 hours or manual
**Steps:**
- Check API health endpoint
- Get metrics
- Restart on failure

## Secrets Required

```
EC2_HOST              - EC2 public IP
EC2_USER              - ubuntu
EC2_SSH_KEY           - Private key content
DOCKERHUB_USERNAME    - Docker Hub username
DOCKERHUB_TOKEN       - Docker Hub access token
DATABASE_URL          - PostgreSQL connection string
JWT_SECRET            - JWT signing secret
JWT_REFRESH_SECRET    - Refresh token secret
REDIS_HOST            - Redis hostname
```

## Deployment Process

1. Developer pushes to feature branch
2. Creates PR to dev
3. PR checks run (test, lint, security)
4. Merge to dev (tests run again)
5. Create PR from dev to main
6. Merge to main triggers:
   - Build Docker image
   - Push to Docker Hub
   - Deploy to EC2
   - Health check

## Manual Deployment

```bash
# Trigger deployment manually
gh workflow run deploy.yml

# Rollback to previous version
gh workflow run rollback.yml -f version=v1.3.0
```

## Monitoring

- GitHub Actions dashboard shows all runs
- Docker Hub shows all images
- UptimeRobot monitors API availability
- CloudWatch shows application logs

## Testing Locally

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build Docker image
docker build -t habit-tracker-test .

# Run container
docker run -p 3000:3000 --env-file .env habit-tracker-test
```

## Troubleshooting

### Deployment Failed
1. Check GitHub Actions logs
2. SSH to EC2: `ssh -i key.pem ubuntu@IP`
3. Check container: `docker ps -a`
4. Check logs: `docker logs habit-tracker-api`

### Tests Failed
1. Check test output in Actions
2. Run locally: `npm test`
3. Check service health (PostgreSQL, Redis)

### Docker Build Failed
1. Check Dockerfile syntax
2. Verify all files exist
3. Test build locally

## Best Practices

- Always create PR for changes
- Wait for checks before merging
- Tag releases with semantic versioning
- Test rollback procedure
- Monitor deployments
- Keep secrets updated
