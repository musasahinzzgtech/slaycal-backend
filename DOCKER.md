# Docker Setup Guide — SlayCall Express Backend

This guide covers everything you need to run, manage, debug, and deploy the SlayCall backend with Docker.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Docker Files](#2-project-docker-files)
3. [First-Time Setup](#3-first-time-setup)
4. [Daily Development Workflow](#4-daily-development-workflow)
5. [Useful Commands](#5-useful-commands)
6. [Accessing the Running Services](#6-accessing-the-running-services)
7. [Running the Seed Script](#7-running-the-seed-script)
8. [Logs](#8-logs)
9. [Volumes & Data Persistence](#9-volumes--data-persistence)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Swapping to Cloud Services (Atlas + Upstash)](#11-swapping-to-cloud-services-atlas--upstash)
12. [Building & Pushing the Image](#12-building--pushing-the-image)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Docker Desktop (Mac/Windows) or Docker Engine (Linux) | 24.x | `docker --version` |
| Docker Compose plugin | v2 (bundled with Docker Desktop) | `docker compose version` |

> **Note:** Use `docker compose` (v2, no hyphen), not `docker-compose` (v1 legacy).

---

## 2. Project Docker Files

```
express-backend/
├── Dockerfile            # Two-stage Bun production image
├── docker-compose.yml    # Orchestrates app + MongoDB + Redis
├── .dockerignore         # Excludes secrets, node_modules, .git
└── .env.example          # Template — copy to .env and fill in secrets
```

### What runs inside compose

| Service | Image | Role |
|---------|-------|------|
| `app` | local build (Bun 1.1 Alpine) | Express API on port 3000 |
| `mongo` | `mongo:7-jammy` | MongoDB database |
| `redis` | `redis:7-alpine` | Quota counters + session caching |

All three services are on an isolated Docker network. MongoDB and Redis are **not exposed to your host machine by default** — only the API port is.

---

## 3. First-Time Setup

### Step 1 — Copy and fill in `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in the real values:

```dotenv
NODE_ENV=development
PORT=3000

# Leave these as-is for local docker-compose
MONGODB_URI=mongodb://mongo:27017/slaycall
REDIS_URL=redis://redis:6379

JWT_SECRET=replace-with-a-long-random-string

OPENAI_API_KEY=sk-proj-...

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

CORS_ORIGINS=http://localhost:8081,http://localhost:3000
```

> **`MONGODB_URI` and `REDIS_URL`** are automatically overridden by `docker-compose.yml` to point at the sibling containers. You only need to change them when connecting to external services (see §11).

---

### Step 2 — Build and start everything

```bash
docker compose up --build
```

This will:
1. Pull `mongo:7-jammy` and `redis:7-alpine` images
2. Build the `app` image from `Dockerfile`
3. Start Redis and MongoDB, wait for their health checks to pass
4. Start the Express API

Expected output:

```
[+] Running 3/3
 ✔ mongo   healthy
 ✔ redis   healthy
 ✔ app     started

[Redis] Connected
[Redis] Ready
[MongoDB] Connected
[Server] Running on port 3000 (development)
```

---

### Step 3 — Seed the database (first time only)

```bash
docker compose exec app bun scripts/seedSurveyQuestions.js
```

This inserts the 13 onboarding survey questions into MongoDB.

---

## 4. Daily Development Workflow

```bash
# Start all services (detached / background)
docker compose up -d

# Stop all services (keeps data volumes)
docker compose down

# Stop and wipe ALL data (volumes deleted)
docker compose down -v

# Restart only the API after a code change
docker compose restart app

# Rebuild the app image after dependency changes (package.json / bun.lock)
docker compose up --build app
```

> **Hot-reload:** The current setup does **not** mount source code into the container. After any code change you must `docker compose restart app` (fast, no rebuild) or `docker compose up --build app` if you changed dependencies.

---

## 5. Useful Commands

### Check running containers

```bash
docker compose ps
```

### Open a shell inside the app container

```bash
docker compose exec app sh
```

### Open MongoDB shell

```bash
docker compose exec mongo mongosh slaycall
```

### Open Redis CLI

```bash
docker compose exec redis redis-cli
```

Useful Redis commands once inside:

```
# See all quota keys for a user
KEYS quota:<userId>:*

# Check today's scan counter for a user
GET quota:<userId>:scan:20260411

# See Redis memory usage
INFO memory

# Flush all keys (DANGEROUS — resets all quota counters)
FLUSHALL
```

### Check container resource usage

```bash
docker stats
```

---

## 6. Accessing the Running Services

| Service | URL / address | Notes |
|---------|--------------|-------|
| REST API | `http://localhost:3000` | Always exposed |
| Swagger UI | `http://localhost:3000/api-docs` | Always exposed |
| MongoDB | Not exposed by default | Uncomment ports in `docker-compose.yml` to reach via Compass |
| Redis | Not exposed by default | Uncomment ports in `docker-compose.yml` to reach via RedisInsight |

### To expose MongoDB for Compass

Edit `docker-compose.yml`, find the `mongo:` service block, and uncomment:

```yaml
    ports:
      - "27017:27017"
```

Then restart: `docker compose restart mongo`

Connect Compass to: `mongodb://localhost:27017`

### To expose Redis for RedisInsight

Edit `docker-compose.yml`, find the `redis:` service block, and uncomment:

```yaml
    ports:
      - "6379:6379"
```

Then restart: `docker compose restart redis`

Connect RedisInsight to: `localhost:6379`

---

## 7. Running the Seed Script

The survey question seeder must be run once after the database is clean:

```bash
docker compose exec app bun scripts/seedSurveyQuestions.js
```

To run it against a one-off container (without compose running):

```bash
docker run --rm \
  --network slaycall-network \
  -e MONGODB_URI=mongodb://mongo:27017/slaycall \
  slaycall-app \
  bun scripts/seedSurveyQuestions.js
```

---

## 8. Logs

### Follow all services

```bash
docker compose logs -f
```

### Follow a single service

```bash
docker compose logs -f app
docker compose logs -f mongo
docker compose logs -f redis
```

### Last N lines

```bash
docker compose logs --tail=100 app
```

---

## 9. Volumes & Data Persistence

Docker named volumes keep your data safe across container restarts and rebuilds.

| Volume | Contains | Cleared by |
|--------|----------|-----------|
| `mongo_data` | All MongoDB collections | `docker compose down -v` |
| `redis_data` | Persisted Redis AOF log (quota counters survive restarts) | `docker compose down -v` |

> **Rebuilding the image** (`--build`) does **not** touch volumes. Your database data is safe.

### Backup MongoDB

```bash
docker compose exec mongo mongodump \
  --db slaycall \
  --out /tmp/backup

docker cp $(docker compose ps -q mongo):/tmp/backup ./mongo-backup
```

### Restore MongoDB

```bash
docker cp ./mongo-backup $(docker compose ps -q mongo):/tmp/backup

docker compose exec mongo mongorestore \
  --db slaycall \
  /tmp/backup/slaycall
```

---

## 10. Environment Variables Reference

All variables are loaded from `.env` via `env_file: .env` in compose.  
`MONGODB_URI` and `REDIS_URL` are **always overridden** by the compose `environment:` block to use sibling container hostnames.

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | No | `development` | Set to `production` in prod |
| `PORT` | No | `3000` | Defaults to `3000` |
| `MONGODB_URI` | Yes | `mongodb://mongo:27017/slaycall` | Overridden by compose |
| `REDIS_URL` | Yes | `redis://redis:6379` | Overridden by compose |
| `JWT_SECRET` | Yes | `a-long-random-string` | Never commit the real value |
| `JWT_ACCESS_EXPIRATION` | No | `7d` | |
| `JWT_REFRESH_EXPIRATION` | No | `30d` | |
| `OPENAI_API_KEY` | Yes | `sk-proj-...` | |
| `FIREBASE_PROJECT_ID` | Yes | `my-project` | |
| `FIREBASE_PRIVATE_KEY` | Yes | `"-----BEGIN..."` | Keep the quotes and `\n` |
| `FIREBASE_CLIENT_EMAIL` | Yes | `sdk@...iam.gserviceaccount.com` | |
| `FIREBASE_STORAGE_BUCKET` | Yes | `my-project.appspot.com` | |
| `CORS_ORIGINS` | No | `http://localhost:8081` | Comma-separated list |

---

## 11. Swapping to Cloud Services (Atlas + Upstash)

Use this when you want the API in Docker but databases hosted externally (typical for staging/production).

### MongoDB Atlas

1. Remove (or comment out) the `mongo:` service block in `docker-compose.yml`
2. Remove the `mongo_data` volume entry
3. Remove the `mongo` entry from `app.depends_on`
4. In `.env`, set:

```dotenv
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/slaycall?retryWrites=true&w=majority
```

5. Delete the compose override so your `.env` value is used:

In `docker-compose.yml`, remove this line under `app.environment`:
```yaml
MONGODB_URI: mongodb://mongo:27017/slaycall
```

### Redis (Upstash / Redis Cloud)

1. Remove (or comment out) the `redis:` service block in `docker-compose.yml`
2. Remove the `redis_data` volume entry
3. Remove the `redis` entry from `app.depends_on`
4. In `.env`, set:

```dotenv
# Note: rediss:// (with double-s) enables TLS
REDIS_URL=rediss://:your-password@your-host.upstash.io:6380
```

5. Remove the compose override:
```yaml
REDIS_URL: redis://redis:6379   # delete this line
```

---

## 12. Building & Pushing the Image

### Build locally

```bash
docker build -t slaycall-backend:latest .
```

### Tag and push to a registry

```bash
# Docker Hub
docker tag slaycall-backend:latest your-dockerhub-user/slaycall-backend:latest
docker push your-dockerhub-user/slaycall-backend:latest

# GitHub Container Registry
docker tag slaycall-backend:latest ghcr.io/your-org/slaycall-backend:latest
docker push ghcr.io/your-org/slaycall-backend:latest
```

### Use the pushed image in compose

Replace the `build:` block in `docker-compose.yml`:

```yaml
  app:
    image: ghcr.io/your-org/slaycall-backend:latest  # ← use pre-built image
    # build:                                           # ← remove this block
    #   context: .
    #   dockerfile: Dockerfile
```

---

## 13. Troubleshooting

### App fails to start — "MongoDB connection failed"

The app starts only after Mongo passes its health check. If it keeps failing:

```bash
docker compose logs mongo
```

Common causes:
- Mongo is still initialising (takes ~10–20 s on first run) — just wait and retry
- Volume is corrupted — run `docker compose down -v` and start fresh

---

### App fails to start — "Redis connection failed"

```bash
docker compose logs redis
```

Common causes:
- Redis OOM (exceeded `maxmemory 256mb`) — increase the limit in `docker-compose.yml`
- Wrong `REDIS_URL` in `.env` — confirm it matches `redis://redis:6379` for local compose

---

### Port 3000 is already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Or change the host port in docker-compose.yml
ports:
  - "3001:3000"   # expose on host port 3001 instead
```

---

### Changes to source code not reflected

The image must be rebuilt or the container restarted:

```bash
# Fast restart (no rebuild — good for logic changes)
docker compose restart app

# Rebuild (required when package.json / bun.lock change)
docker compose up --build app
```

---

### Quota counters not resetting

Redis quota keys are set to expire at UTC midnight automatically. If you need to reset them manually:

```bash
docker compose exec redis redis-cli

# Delete one user's scan counter
DEL quota:<userId>:scan:20260411

# Delete ALL quota keys (resets everyone)
KEYS quota:* | xargs redis-cli DEL
```

---

### `bun.lock` conflicts after `bun install`

The Dockerfile uses `--frozen-lockfile`, so the lockfile in the repo must match `package.json`. After changing dependencies locally:

```bash
bun install          # updates bun.lock
git add bun.lock
docker compose up --build app   # rebuild with the new lockfile
```
