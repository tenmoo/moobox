# Getting Started with MooBox

This guide will help you get MooBox up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+**: [Download here](https://www.python.org/downloads/)
- **Node.js 20+**: [Download here](https://nodejs.org/)
- **Git**: [Download here](https://git-scm.com/)

You'll also need API keys for at least one LLM provider:
- OpenAI: [Get a key](https://platform.openai.com/api-keys)
- Anthropic: [Get a key](https://console.anthropic.com/)
- Google AI: [Get a key](https://aistudio.google.com/apikey)
- Or an in-house model served via an OpenAI-compatible endpoint

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd moobox
```

## Step 2: Backend Setup

### 2.1 Navigate to Backend Directory

```bash
cd backend
```

### 2.2 Create Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys for the providers you want to use:
```env
# At least one of these is needed for the corresponding model to work:
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key
```

3. (Optional) Add your in-house model endpoint:
```env
INTERNAL_API_KEY=your-internal-api-key
INTERNAL_API_BASE=http://your-gpu-server:8000/v1
```

### 2.5 Configure Model Registry

The default `models.yaml` includes 4 models. Edit it to match your available providers:

```yaml
models:
  - id: "gpt-4o"
    name: "GPT-4o"
    provider: "openai"
    api_key_env: "OPENAI_API_KEY"

  - id: "claude-sonnet-4-20250514"
    name: "Claude Sonnet"
    provider: "anthropic"
    api_key_env: "ANTHROPIC_API_KEY"
```

Remove any models you don't have API keys for, or they'll return errors in the chat panel.

### 2.6 Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Backend is now running. Visit http://localhost:8000/docs to see the API documentation.

## Step 3: Frontend Setup

Open a **new terminal window** (keep the backend running).

### 3.1 Navigate to Frontend Directory

```bash
cd frontend
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Configure Frontend Environment

```bash
cp .env.local.example .env.local
```

The default `NEXT_PUBLIC_API_URL=http://localhost:8000` should work for local development.

### 3.4 Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 16.x.x
  - Local:   http://localhost:3000
```

Frontend is now running. Visit http://localhost:3000.

## Step 4: Try Your First Comparison

1. Open http://localhost:3000 in your browser
2. The left and right model dropdowns should be populated with your configured models
3. Select different models for each panel
4. Enter a prompt in the input box:
   ```
   Explain the difference between a stack and a queue
   ```
5. Click "Send" or press Enter
6. Watch both models stream their responses side by side!

## Step 5: Alternative — Docker Compose

If you prefer Docker, you can run everything with one command:

```bash
# From the project root
cp backend/.env.example backend/.env   # Edit with your API keys
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Example Prompts to Try

**Factual comparison:**
```
What causes the seasons on Earth?
```

**Code generation:**
```
Write a Python function to find the longest palindromic substring
```

**Creative writing:**
```
Write a haiku about debugging code
```

**Reasoning:**
```
A bat and ball cost $1.10 together. The bat costs $1 more than the ball. How much does the ball cost? Explain step by step.
```

**Instruction following:**
```
List exactly 5 tips for writing clean code. Number each one.
```

## Troubleshooting

### Backend Issues

**Error: "No module named 'fastapi'"**
- Make sure your virtual environment is activated
- Run `pip install -r requirements.txt` again

**Error: "Model not found"**
- Check that the model ID in `models.yaml` matches exactly what LiteLLM expects
- Verify the corresponding API key env var is set in `.env`

**Port 8000 already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

### Frontend Issues

**Error: "Cannot find module"**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Port 3000 already in use:**
- Next.js will automatically suggest an alternative port

**Models dropdown is empty:**
- Make sure the backend is running on port 8000
- Check that `NEXT_PUBLIC_API_URL=http://localhost:8000` is set in `.env.local`
- Try accessing http://localhost:8000/api/models in your browser

### Streaming Issues

**One panel shows an error while the other works:**
- This is by design — each panel streams independently
- Check that the failing model's API key is correctly set

**Responses appear all at once instead of streaming:**
- Some reverse proxies buffer SSE responses
- When running locally, this should not happen

## Next Steps

- Read the [API Documentation](API.md)
- Learn the [Architecture](ARCHITECTURE.md)
- Review the [Project Structure](PROJECT_STRUCTURE.md)
- Read the [Deployment Guide](DEPLOYMENT.md)
- Use the [Quick Reference](QUICK_REFERENCE.md) for common commands

## Development Tips

### Backend Hot Reload

The `--reload` flag enables automatic reload on code changes:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Hot Reload

The Next.js dev server automatically reloads when you edit files.

### Adding a New Model

1. Add the entry to `backend/models.yaml`
2. Set the API key env var in `backend/.env`
3. Restart the backend (or let hot reload pick it up)
4. Refresh the frontend — the new model appears in the dropdowns

### Viewing API Docs

Use the Swagger UI at http://localhost:8000/docs to test API endpoints directly.
