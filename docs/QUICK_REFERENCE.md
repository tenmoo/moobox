# MooBox - Quick Reference

Quick commands and common operations.

## Development Commands

### Start Development Servers

**Backend:**
```bash
cd backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Both (in separate terminals):**
```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## API Quick Reference

### List Models

```bash
curl http://localhost:8000/api/models
```

### Stream Side-by-Side Chat

```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is recursion?"}],
    "left_model": "groq/llama-3.3-70b-versatile",
    "right_model": "groq/llama-3.1-8b-instant"
  }'
```

---

## Docker Commands

### Build and Start (docker-compose)

```bash
docker compose up --build -d
```

### Stop

```bash
docker compose down
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Rebuild Single Service

```bash
docker compose up --build -d backend
docker compose up --build -d frontend
```

---

## Python Quick Reference

### Setup Virtual Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Run with Hot Reload

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Install New Package

```bash
pip install package_name
pip freeze > requirements.txt
```

---

## Node.js Quick Reference

### Install Dependencies

```bash
cd frontend
npm install
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run build
npm run start
```

---

## Model Management

### Add a New Model

1. Edit `backend/models.yaml`:
```yaml
- id: "your-model-id"
  name: "Display Name"
  provider: "openai"
  api_key_env: "YOUR_API_KEY"
  api_base_env: "YOUR_API_BASE"  # optional
```

2. Set env vars in `backend/.env`:
```env
YOUR_API_KEY=your-key-here
YOUR_API_BASE=http://your-server:8000/v1  # if needed
```

3. Restart backend (or let hot reload pick it up)

### Remove a Model

1. Delete the entry from `backend/models.yaml`
2. Restart backend

---

## Troubleshooting Commands

### Kill Process on Port

```bash
# macOS/Linux
lsof -ti:8000 | xargs kill -9  # Backend port
lsof -ti:3000 | xargs kill -9  # Frontend port
```

### Reset Node Modules

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Reset Python Virtual Environment

```bash
cd backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Environment Variables

### Backend (.env)

```env
# Groq (free tier — recommended for getting started)
GROQ_API_KEY=gsk_your-groq-api-key

# Provider API Keys (set the ones you need)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key

# In-house model (optional)
INTERNAL_API_KEY=your-internal-key
INTERNAL_API_BASE=http://your-gpu-server:8000/v1

# App settings
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Copy Templates

```bash
cd backend && cp .env.example .env
cd ../frontend && cp .env.local.example .env.local
```

---

## File Locations

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI entry point |
| `backend/app/config.py` | Application settings |
| `backend/app/models_registry.py` | YAML model registry loader |
| `backend/app/routers/chat.py` | SSE streaming chat endpoint |
| `backend/app/routers/models.py` | Model listing endpoint |
| `backend/app/services/llm.py` | LiteLLM parallel streaming |
| `backend/models.yaml` | Model definitions |
| `frontend/src/app/page.tsx` | Main sandbox page |
| `frontend/src/components/*.tsx` | UI components |
| `frontend/src/lib/api.ts` | SSE client |
| `frontend/src/lib/types.ts` | Shared types |

---

## Example Prompts

**Factual:**
```
What causes the seasons on Earth?
```

**Code generation:**
```
Write a Python function to find the longest palindromic substring
```

**Creative:**
```
Write a haiku about debugging code
```

**Reasoning:**
```
A bat and ball cost $1.10 together. The bat costs $1 more than the ball. How much does the ball cost?
```

---

## Documentation Links

| Document | Description |
|----------|-------------|
| [GETTING_STARTED](GETTING_STARTED.md) | Setup guide |
| [ARCHITECTURE](ARCHITECTURE.md) | System design |
| [API](API.md) | API reference |
| [DEPLOYMENT](DEPLOYMENT.md) | Deployment guide |
| [PROJECT_STRUCTURE](PROJECT_STRUCTURE.md) | File structure |
| [CHANGELOG](CHANGELOG.md) | Version history |
