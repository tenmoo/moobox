# MooBox - Deployment Guide

This guide covers deploying MooBox to production or staging environments.

## Overview

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| Backend | Docker / any container host | AWS ECS, GCP Cloud Run, Railway |
| Frontend | Vercel | Netlify, Cloudflare Pages, Docker |
| Both | docker-compose | Kubernetes |

## Prerequisites

- Docker and Docker Compose installed
- API keys for the LLM providers you want to use
- (Optional) A container registry if deploying to a remote host

---

## Docker Compose (Recommended)

The simplest way to deploy both services together.

### Step 1: Configure Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your production API keys:
```env
GROQ_API_KEY=gsk_prod-groq-key
OPENAI_API_KEY=sk-prod-key
ANTHROPIC_API_KEY=sk-ant-prod-key
GOOGLE_API_KEY=prod-google-key
CORS_ORIGINS=https://your-domain.com
```

### Step 2: Build and Start

```bash
docker compose up --build -d
```

### Step 3: Verify

```bash
# Check services are running
docker compose ps

# Check backend health
curl http://localhost:8000/api/models

# Check frontend
curl http://localhost:3000
```

### Step 4: View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Backend Only (Docker)

### Build

```bash
cd backend
docker build -t moobox-backend .
```

### Run

```bash
docker run -d \
  --name moobox-backend \
  -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/models.yaml:/app/models.yaml:ro \
  moobox-backend
```

---

## Frontend Only (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Configure Environment

In Vercel Dashboard or via CLI, set:
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://api.your-domain.com`)

### Step 3: Deploy

```bash
cd frontend

# First deployment
vercel

# Production
vercel --prod
```

### Step 4: Build Settings

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (Vercel default for Next.js)
- **Root Directory**: `frontend`

---

## Environment Variables

### Backend (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Per model | Groq API key (free tier available) |
| `OPENAI_API_KEY` | Per model | OpenAI API key |
| `ANTHROPIC_API_KEY` | Per model | Anthropic API key |
| `GOOGLE_API_KEY` | Per model | Google AI API key |
| `INTERNAL_API_KEY` | Per model | API key for in-house endpoint |
| `INTERNAL_API_BASE` | Per model | Base URL for in-house endpoint |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |

### Frontend (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default: `http://localhost:8000`) |

---

## Model Registry

The model registry (`backend/models.yaml`) is mounted as a read-only volume in docker-compose. To update models:

1. Edit `backend/models.yaml`
2. Restart the backend: `docker compose restart backend`

---

## Health Checks

Set up monitoring for:
```
GET http://your-backend:8000/api/models
```

Expected response: JSON array of configured models.

---

## Security Checklist

- [ ] API keys stored as secrets (not in code or images)
- [ ] HTTPS enabled (use a reverse proxy like nginx, Caddy, or Traefik)
- [ ] CORS configured for production domain only
- [ ] `models.yaml` does not contain raw API keys (only env var references)
- [ ] Consider adding authentication before exposing to wider network

---

## Scaling Considerations

- **Backend**: Stateless — scale horizontally behind a load balancer
- **Frontend**: Next.js standalone mode — one container per instance
- **SSE connections**: Each active comparison holds one HTTP connection; plan connection limits accordingly
- **Rate limits**: LLM provider rate limits are the primary bottleneck; consider caching or queuing for high traffic

---

## Rollback

### Docker Compose
```bash
docker compose down
docker compose up --build -d
```

### Vercel
Dashboard → Deployments → Promote previous to production
