# MooBox - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (Browser - localhost:3000)                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ HTTP
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16 App Router)                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        App Shell (page.tsx)                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │  Header +    │  │ ModelSelector│  │ ModelSelector│            │    │
│  │  │  New Chat    │  │   (Left)     │  │   (Right)    │            │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │    │
│  │                                                                    │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐              │    │
│  │  │     ChatPanel        │  │     ChatPanel        │              │    │
│  │  │  ┌────────────────┐  │  │  ┌────────────────┐  │              │    │
│  │  │  │ MessageBubble  │  │  │  │ MessageBubble  │  │              │    │
│  │  │  │ MessageBubble  │  │  │  │ MessageBubble  │  │              │    │
│  │  │  │ (streaming...) │  │  │  │ (streaming...) │  │              │    │
│  │  │  └────────────────┘  │  │  └────────────────┘  │              │    │
│  │  └──────────────────────┘  └──────────────────────┘              │    │
│  │                                                                    │    │
│  │  ┌────────────────────────────────────────────────────┐          │    │
│  │  │              PromptInput (shared)                    │          │    │
│  │  └────────────────────────────────────────────────────┘          │    │
│  │                                                                    │    │
│  │  ┌────────────────────────────────────────────────────┐          │    │
│  │  │  SSE Client (lib/api.ts)                            │          │    │
│  │  │  • fetchModels() → GET /api/models                  │          │    │
│  │  │  • streamChat() → POST /api/chat (SSE)             │          │    │
│  │  │  • Demux by panel field → left/right state          │          │    │
│  │  └──────────────┬─────────────────────────────────────┘          │    │
│  └─────────────────┼────────────────────────────────────────────────┘    │
└────────────────────┼──────────────────────────────────────────────────────┘
                     │
                     │ POST /api/chat (SSE) · GET /api/models
                     │
┌────────────────────▼──────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI - localhost:8000)                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    API Layer (routers/)                             │  │
│  │  ┌─────────────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │ GET /api/models     │  │ POST /api/chat                    │  │  │
│  │  │ (list registry)     │  │ (SSE streaming response)          │  │  │
│  │  └──────────┬──────────┘  └───────────────┬───────────────────┘  │  │
│  │             │                              │                      │  │
│  │  ┌──────────▼──────────────────────────────▼──────────────────┐  │  │
│  │  │                    Services Layer                            │  │  │
│  │  │                                                              │  │  │
│  │  │  ModelRegistry          LLM Service (services/llm.py)       │  │  │
│  │  │  ┌──────────────┐      ┌──────────────────────────────┐    │  │  │
│  │  │  │ models.yaml  │      │ stream_dual()                 │    │  │  │
│  │  │  │ → ModelEntry │      │  ├─ _stream_one(left)         │    │  │  │
│  │  │  │   objects    │      │  ├─ _stream_one(right)        │    │  │  │
│  │  │  └──────────────┘      │  └─ asyncio.Queue multiplex   │    │  │  │
│  │  │                        └──────────────┬────────────────┘    │  │  │
│  │  └───────────────────────────────────────┼────────────────────┘  │  │
│  └──────────────────────────────────────────┼────────────────────────┘  │
└─────────────────────────────────────────────┼──────────────────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
            ┌────────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
            │  In-House Model │    │   OpenAI / Anthropic │   │  Google Gemini  │
            │  (OpenAI-compat)│    │   (native APIs)      │   │  (native API)   │
            │                 │    │                      │   │                 │
            │ vLLM / TGI /   │    │ gpt-4o               │   │ gemini-2.0-flash│
            │ LiteLLM proxy  │    │ claude-sonnet-4       │   │                 │
            └─────────────────┘    └──────────────────────┘   └─────────────────┘
```

## SSE Streaming Flow

```
User types prompt → clicks Send
    │
    │ 1. Frontend calls POST /api/chat with messages + left_model + right_model
    ▼
FastAPI endpoint (routers/chat.py)
    │
    │ 2. Looks up both models in registry
    │ 3. Calls stream_dual(left_entry, right_entry, messages)
    ▼
LLM Service (services/llm.py)
    │
    │ 4. Creates asyncio.Queue + two producer tasks
    │
    ├──▶ _stream_one(left_entry, messages, "left")
    │        │
    │        │ litellm.acompletion(model=..., stream=True)
    │        │
    │        ├── chunk → queue.put({"panel": "left", "delta": "Hello"})
    │        ├── chunk → queue.put({"panel": "left", "delta": " world"})
    │        └── done  → queue.put(None)
    │
    ├──▶ _stream_one(right_entry, messages, "right")
    │        │
    │        │ litellm.acompletion(model=..., stream=True)
    │        │
    │        ├── chunk → queue.put({"panel": "right", "delta": "Hi"})
    │        ├── chunk → queue.put({"panel": "right", "delta": " there"})
    │        └── done  → queue.put(None)
    │
    │ 5. Generator drains queue, yields SSE events as they arrive:
    │    data: {"panel": "left", "delta": "Hello"}
    │    data: {"panel": "right", "delta": "Hi"}
    │    data: {"panel": "left", "delta": " world"}
    │    data: {"panel": "right", "delta": " there"}
    │    data: [DONE]
    ▼
Frontend (lib/api.ts)
    │
    │ 6. ReadableStream reader parses SSE events
    │ 7. Routes deltas by panel field:
    │    "left"  → setLeftMessages(...)
    │    "right" → setRightMessages(...)
    ▼
User sees both responses streaming simultaneously
```

## Technology Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  • Next.js 16 App Router (React Client Components)              │
│  • Tailwind CSS v4 + shadcn/ui component library                │
│  • Responsive: side-by-side (desktop) / stacked (mobile)        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    SSE Client Layer                              │
│  • fetch() with ReadableStream for SSE consumption              │
│  • Panel-based demultiplexing (left/right)                      │
│  • React useState for per-panel message state                   │
│  • AbortController for stream cancellation                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP: GET /api/models, POST /api/chat
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    API Layer (FastAPI)                           │
│  • GET /api/models — list available models from registry        │
│  • POST /api/chat — SSE multiplexed dual-model stream           │
│  • CORS middleware for frontend origin                           │
│  • Pydantic request validation                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    LLM Gateway Layer (LiteLLM)                  │
│  • litellm.acompletion() for async streaming completions        │
│  • Unified interface: OpenAI, Anthropic, Gemini, custom         │
│  • Per-model api_key and api_base from registry                 │
│  • asyncio.Queue for parallel stream multiplexing               │
│  • Per-panel error isolation                                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Configuration Layer                           │
│  • models.yaml — model registry (id, name, provider, keys)     │
│  • pydantic-settings — type-safe env var loading                │
│  • .env — API keys, CORS origins                                │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Compose                          │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │  frontend        │          │   backend      │
    │  (Next.js)       │          │   (FastAPI)    │
    │                  │          │                │
    │ • Port 3000      │          │ • Port 8000    │
    │ • Standalone     │  HTTP    │ • Uvicorn      │
    │   output mode    │◀────────▶│ • models.yaml  │
    │ • Multi-stage    │          │   (volume)     │
    │   Dockerfile     │          │ • .env (keys)  │
    └──────────────────┘          └───────┬────────┘
                                          │
                               ┌──────────┼───────────┐
                               │          │           │
                      ┌────────▼──┐  ┌────▼─────┐  ┌─▼──────────┐
                      │ In-House  │  │ OpenAI / │  │ Google     │
                      │ Models    │  │ Anthropic│  │ Gemini     │
                      └───────────┘  └──────────┘  └────────────┘
```

---

This architecture provides:
- **Side-by-side streaming**: Two models compared in real time with a single prompt
- **Provider-agnostic**: LiteLLM unifies OpenAI, Anthropic, Google, and any OpenAI-compatible endpoint
- **Zero-code model management**: YAML registry for adding/removing models
- **Error isolation**: One panel can fail without affecting the other
- **Responsive UI**: shadcn/ui + Tailwind for a modern, accessible interface
