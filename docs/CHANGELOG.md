# Changelog

All notable changes to the MooBox project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-05

### Added

#### Backend
- Groq provider support with 3 models: Llama 3.3 70B, Llama 3.1 8B, GPT-OSS 120B
- `GROQ_API_KEY` environment variable for Groq API access
- Structured logging in LLM service (stream start info, error details)

#### Frontend
- Markdown rendering for assistant messages via `react-markdown` + `remark-gfm`
- Tailwind Typography plugin (`@tailwindcss/typography`) for prose styling
- Headings, code blocks, lists, tables, and links render correctly in chat

### Changed

#### Backend
- Replaced `EventSourceResponse` (sse-starlette) with `StreamingResponse` (FastAPI native) to fix double SSE wrapping
- Added `Cache-Control: no-cache` and `X-Accel-Buffering: no` response headers for reliable streaming
- Suppressed harmless Pydantic serializer warnings from LiteLLM
- Added `extra = "ignore"` to pydantic-settings `Config` to tolerate extra env vars
- Model registry expanded from 4 to 7 models (3 Groq + 4 original)

### Fixed
- SSE streaming now works correctly (was double-wrapping `data:` events)
- Backend no longer crashes on unrecognized environment variables

---

## [0.1.0] - 2026-03-03

### Added

#### Backend (FastAPI + LiteLLM)
- FastAPI application with lifespan-managed model registry
- YAML-based model registry (`models.yaml`) with 4 pre-configured models:
  - Internal Moo 7B (OpenAI-compatible endpoint)
  - GPT-4o (OpenAI)
  - Claude Sonnet (Anthropic)
  - Gemini 2.0 Flash (Google)
- `ModelEntry` dataclass with runtime env var resolution for API keys and base URLs
- `ModelRegistry` with index-based lookup and list methods
- LiteLLM integration for unified multi-provider streaming:
  - `_stream_one()` — single model async streaming with panel-tagged SSE events
  - `stream_dual()` — parallel dual-model streaming via `asyncio.Queue` multiplexing
  - Per-panel error isolation (one model can fail without affecting the other)
- RESTful API endpoints:
  - `GET /api/models` — list available models from registry
  - `POST /api/chat` — SSE streaming side-by-side completions
- pydantic-settings configuration with `.env` file support
- CORS middleware with configurable origins

#### Frontend (Next.js + Tailwind + shadcn/ui)
- Next.js 16 App Router with TypeScript
- Tailwind CSS v4 + shadcn/ui component library (button, card, scroll-area, select)
- Side-by-side chat interface:
  - **ModelSelector** — dropdown for each panel, populated from `GET /api/models`
  - **ChatPanel** — scrollable message list per model with auto-scroll
  - **MessageBubble** — user/assistant message styling with streaming cursor animation
  - **PromptInput** — shared textarea with Enter to send, Shift+Enter for new line
- SSE streaming client (`lib/api.ts`):
  - `fetchModels()` — fetch model list from backend
  - `streamChat()` — POST to `/api/chat`, parse SSE stream, demux by panel field
  - AbortController support for stream cancellation
- Auto-selection of first two models on load
- Multi-turn conversation tracking (in-memory via ref)
- "New chat" button to reset both panels
- Responsive layout: side-by-side on desktop, stacked on mobile

#### Deployment
- Backend Dockerfile (Python 3.12-slim)
- Frontend multi-stage Dockerfile (Node 20-alpine, standalone output)
- docker-compose.yml with backend + frontend services
- `.dockerignore` files for both services

#### Documentation
- `docs/prd.md` — Product requirements document
- `docs/ARCHITECTURE.md` — System architecture diagrams (ASCII)
- `docs/API.md` — Complete API reference
- `docs/GETTING_STARTED.md` — Setup guide
- `docs/PROJECT_STRUCTURE.md` — File structure overview
- `docs/DEPLOYMENT.md` — Deployment guide
- `docs/CHANGELOG.md` — This file
- `docs/QUICK_REFERENCE.md` — Quick commands
- `README.md` — Project overview

---

## [Unreleased]

### Planned Features
- Blind evaluation / voting mode
- Parameter tuning UI (temperature, top-p, system prompt)
- Persistent conversation history
- Structured ratings & export (CSV/JSON)
- User authentication and identity tracking
