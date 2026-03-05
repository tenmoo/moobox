# MooBox - Project Structure

Complete overview of the project structure and files.

## Directory Tree

```
moobox/
├── backend/                        # FastAPI + LiteLLM backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Application configuration (pydantic-settings)
│   │   ├── main.py                # FastAPI entry point, CORS, lifespan
│   │   ├── models_registry.py     # YAML model registry loader
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py            # POST /api/chat (SSE streaming)
│   │   │   └── models.py          # GET /api/models
│   │   └── services/
│   │       ├── __init__.py
│   │       └── llm.py             # LiteLLM wrapper, parallel streaming
│   ├── models.yaml                # Model definitions
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Backend container
│   ├── .dockerignore
│   └── .env.example               # Environment template
│
├── frontend/                      # Next.js 16 + Tailwind + shadcn/ui frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css        # Tailwind + shadcn CSS variables
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── page.tsx           # Main sandbox page (side-by-side UI)
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx      # Scrollable message list per model
│   │   │   ├── MessageBubble.tsx  # User/assistant message rendering
│   │   │   ├── ModelSelector.tsx  # Model dropdown selector
│   │   │   ├── PromptInput.tsx    # Shared prompt textarea + send button
│   │   │   └── ui/               # shadcn/ui primitives
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── scroll-area.tsx
│   │   │       └── select.tsx
│   │   └── lib/
│   │       ├── api.ts             # SSE client, fetch helpers
│   │       ├── types.ts           # Shared TypeScript types
│   │       └── utils.ts           # shadcn utility (cn)
│   ├── package.json               # Node.js dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── next.config.ts             # Next.js config (standalone output)
│   ├── components.json            # shadcn/ui config
│   ├── Dockerfile                 # Multi-stage frontend container
│   ├── .dockerignore
│   └── .env.local.example         # Frontend environment template
│
├── docs/                          # Documentation
│   ├── prd.md                     # Product requirements
│   ├── ARCHITECTURE.md            # Architecture diagrams
│   ├── API.md                     # API reference
│   ├── GETTING_STARTED.md         # Setup guide
│   ├── PROJECT_STRUCTURE.md       # This file
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── CHANGELOG.md               # Change history
│   └── QUICK_REFERENCE.md         # Quick commands
│
├── docker-compose.yml             # Backend + frontend services
└── README.md                      # Project overview
```

## File Descriptions

### Backend Files

#### `app/config.py`
Application configuration:
- `Settings` class via pydantic-settings with `extra = "ignore"` (tolerates unrelated env vars)
- `cors_origins` — comma-separated allowed origins (default: `http://localhost:3000`)
- `models_file` — path to model registry YAML (default: `models.yaml`)
- Automatic `.env` file loading

#### `app/main.py`
FastAPI entry point:
- Suppresses harmless Pydantic serializer warnings from LiteLLM
- Lifespan handler loads `models.yaml` into `app.state.registry` at startup
- CORS middleware configured from `settings.cors_origin_list`
- Includes routers with `/api` prefix
- App title: "MooBox", version: "0.1.0"

#### `app/models_registry.py`
YAML-based model registry:
- `ModelEntry` dataclass — `id`, `name`, `provider`, `api_key_env`, `api_base_env`
- `ModelEntry.api_key` / `ModelEntry.api_base` — resolve env var names to values at runtime
- `ModelRegistry` — list + index of entries with `get(model_id)` and `list_models()` methods
- `load_registry(path)` — parses YAML and builds registry

#### `app/routers/chat.py`
Chat SSE streaming endpoint:
- `POST /api/chat` — accepts `ChatRequest` (messages, left_model, right_model)
- Validates both model IDs against registry (404 if not found)
- Returns `StreamingResponse` with `Cache-Control: no-cache` and `X-Accel-Buffering: no` headers

#### `app/routers/models.py`
Model listing endpoint:
- `GET /api/models` — returns `{"models": [...]}` from registry

#### `app/services/llm.py`
LiteLLM streaming service:
- `_stream_one(model_entry, messages, panel)` — streams completions from a single model, yielding panel-tagged SSE events
- `stream_dual(left_entry, right_entry, messages)` — runs two `_stream_one` producers in parallel via `asyncio.Queue`, multiplexes into a single SSE stream
- Per-model error handling: exceptions become `{"panel": "...", "error": "..."}`
- Structured logging: info on stream start, error on LiteLLM failures
- Terminates with `data: [DONE]`

#### `models.yaml`
Model registry configuration:
- 7 pre-configured models:
  - Groq: Llama 3.3 70B, Llama 3.1 8B, GPT-OSS 120B (free tier)
  - In-house: Moo 7B (OpenAI-compatible endpoint)
  - Frontier: GPT-4o (OpenAI), Claude Sonnet (Anthropic), Gemini 2.0 Flash (Google)
- Each entry: `id`, `name`, `provider`, `api_key_env`, optional `api_base_env`

### Frontend Files

#### `src/app/page.tsx`
Main sandbox page (client component):
- Fetches models on mount via `fetchModels()`
- Auto-selects first two models for left/right panels
- `handleSend` — calls `streamChat()`, demuxes deltas by panel, updates per-panel message state
- `handleNewChat` — aborts active stream, resets both panels
- Conversation ref tracks multi-turn history

#### `src/app/layout.tsx`
Root layout:
- HTML structure, Geist font loading, metadata
- Title: "MooBox", description: "Side-by-side AI model comparison sandbox"

#### `src/components/ChatPanel.tsx`
Scrollable message panel:
- Displays model name header
- Renders `MessageBubble` for each message
- Auto-scrolls to bottom on new messages
- Empty state: "Responses will appear here."

#### `src/components/MessageBubble.tsx`
Message display:
- User messages: right-aligned, primary background, plain text
- Assistant messages: left-aligned, muted background, rendered as Markdown via `react-markdown` + `remark-gfm` (headings, bold, code blocks, lists, tables, links)
- Tailwind Typography (`prose`) classes for consistent Markdown styling
- Streaming cursor: animated pulse indicator on last assistant message

#### `src/components/ModelSelector.tsx`
Model dropdown:
- shadcn/ui `Select` component
- Shows model name + provider badge
- Disabled during streaming

#### `src/components/PromptInput.tsx`
Shared prompt input:
- Textarea with Enter to send, Shift+Enter for new line
- Send button disabled when empty or streaming
- Clears on send

#### `src/lib/api.ts`
API client:
- `fetchModels()` — `GET /api/models`, returns `ModelInfo[]`
- `streamChat(body, onDelta, onDone, signal)` — `POST /api/chat`, reads SSE stream via `ReadableStream`, parses events, routes deltas to callback
- Configurable `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)

#### `src/lib/types.ts`
Shared TypeScript types:
- `ModelInfo` — `{id, name, provider}`
- `Message` — `{role, content}`
- `ChatRequest` — `{messages, left_model, right_model}`
- `StreamDelta` — `{panel, delta?, error?}`

### Configuration Files

#### `backend/requirements.txt`
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
litellm==1.57.2
pydantic-settings==2.7.1
pyyaml==6.0.2
sse-starlette==2.2.1
python-dotenv==1.0.1
```

#### `frontend/package.json`
Key dependencies:
- next, react, react-dom
- tailwindcss, @tailwindcss/postcss, @tailwindcss/typography
- react-markdown, remark-gfm
- shadcn/ui components (button, card, scroll-area, select)
- typescript, eslint

## Environment Variables

### Backend (`.env`)
```env
# Groq (free tier — https://console.groq.com)
GROQ_API_KEY=gsk_your-groq-api-key

# In-house model (OpenAI-compatible endpoint)
INTERNAL_API_KEY=your-internal-api-key
INTERNAL_API_BASE=http://internal-gpu-server:8000/v1

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google
GOOGLE_API_KEY=your-google-api-key

# App settings
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development Workflow

1. **Start Backend**:
   ```bash
   cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend**:
   ```bash
   cd frontend && npm install && npm run dev
   ```

3. **View App**: http://localhost:3000

4. **API Docs**: http://localhost:8000/docs
