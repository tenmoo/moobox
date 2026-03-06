# MooBox - Product Requirements Document

## 1. Executive Summary

MooBox is a side-by-side AI model comparison sandbox that enables internal teams to qualitatively evaluate in-house LLM models against frontier models. Users send one prompt and see two models respond simultaneously in real time, facilitating rapid qualitative assessment of model quality, tone, accuracy, and latency.

## 2. Problem Statement

Teams developing and fine-tuning in-house LLMs face several challenges when evaluating model quality:

- Comparing model outputs requires manually switching between different UIs, terminals, or API clients
- There is no standardized way for non-technical stakeholders to explore model behavior side-by-side
- Qualitative differences between models (tone, reasoning depth, formatting) are hard to assess without direct visual comparison
- Adding new models or providers requires code changes in evaluation tooling

MooBox addresses this by providing a unified interface where any two models can be compared with a single prompt, using real-time streaming to show responses as they arrive.

## 3. Product Vision

MooBox aims to be the internal team's go-to tool for qualitative LLM exploration: a clean, responsive web interface where users pick two models from a registry, type a prompt, and watch both responses stream in side by side. The system is provider-agnostic — any model accessible via an OpenAI-compatible API, or through a supported provider (OpenAI, Anthropic, Google), can be added to the registry without code changes.

## 4. Target Users

### Primary Users

- **ML engineers**: Evaluating fine-tuned in-house models against frontier baselines
- **Product managers**: Exploring model behavior for feature planning and stakeholder demos
- **QA / evaluation teams**: Running qualitative spot checks across model versions

### User Personas


| Persona         | Goal                                                      | Example Prompt                                      |
| --------------- | --------------------------------------------------------- | --------------------------------------------------- |
| ML Engineer     | "Compare my fine-tuned 7B against GPT-4o on coding tasks" | "Write a Python function to merge two sorted lists" |
| Product Manager | "See how our model handles customer-facing language"      | "Draft a friendly email declining a refund request" |
| QA Evaluator    | "Spot-check reasoning quality across providers"           | "Explain step by step why the sky is blue"          |


## 5. Core Features

### 5.1 Side-by-Side Streaming Chat

The primary feature of MooBox v1:

- **Shared prompt input**: One text input sends the same prompt to two models simultaneously
- **Dual streaming panels**: Left and right panels stream responses in real time via SSE
- **Model selection**: Dropdowns to pick any model from the registry for each panel
- **Conversation continuity**: Multi-turn conversations tracked per session (in-memory)
- **New chat**: Reset both panels and start a fresh conversation

### 5.2 YAML-Based Model Registry

Models are configured in `backend/models.yaml` — no code changes needed to add or remove models:

- Each entry specifies: `id`, `name`, `provider`, `api_key_env`, and optional `api_base_env`
- In-house models use `provider: "openai"` with a custom `api_base_env` pointing to the internal endpoint
- Groq models use `provider: "groq"` for fast, free-tier inference
- Frontier models use their native provider keys (`openai`, `anthropic`, `gemini`)
- API keys are referenced by environment variable name, never stored in the YAML

### 5.3 Unified Model Gateway (LiteLLM)

LiteLLM provides a single interface to 100+ LLM providers:

- **OpenAI-compatible endpoints**: In-house models served via vLLM, TGI, or LiteLLM proxy connect natively
- **Native provider support**: Groq, OpenAI, Anthropic, Google Gemini, and others work out of the box
- **Streaming**: Async streaming via `litellm.acompletion()` with `stream=True`
- **Error isolation**: Per-model error handling — if one model fails, the other panel continues streaming

## 6. User Experience & Interface

### 6.1 Interface Components

- **Header**: App title ("MooBox") and "New chat" button
- **ModelSelector**: Two dropdowns (left/right) populated from `GET /api/models`
- **ChatPanel**: Scrollable message list per model with auto-scroll on new content
- **MessageBubble**: User messages (right-aligned, primary color) and assistant messages (left-aligned, muted) with Markdown rendering (headings, code blocks, lists, tables)
- **PromptInput**: Shared textarea with Send button; Enter to send, Shift+Enter for new line

### 6.2 User Flow

1. User opens MooBox — models are loaded from the backend registry
2. First two models are auto-selected (left and right)
3. User types a prompt and presses Enter or clicks Send
4. Both panels show the user's message, then begin streaming assistant responses simultaneously
5. User can continue the conversation (multi-turn) or click "New chat" to reset

### 6.3 Design Principles

- **Tailwind CSS** + **shadcn/ui** for a clean, modern component library
- Responsive layout: side-by-side on desktop, stacked on mobile
- Streaming cursor animation while responses are in flight
- Disabled controls during streaming to prevent conflicting requests

## 7. Technical Requirements

### 7.1 Streaming Architecture

- **Server-Sent Events (SSE)**: Backend opens two parallel `litellm.acompletion()` streams and multiplexes them into a single SSE connection
- **Panel tagging**: Each SSE event is tagged with `{"panel": "left" | "right", "delta": "..."}` so the frontend can demux
- **asyncio.Queue**: Producer tasks feed a shared queue; the SSE generator drains it, yielding events as they arrive from either model
- **Graceful termination**: `[DONE]` sentinel signals end of stream; tasks are cancelled on disconnect

### 7.2 Technology Stack

#### Backend

- **Framework**: FastAPI 0.115.6
- **Language**: Python 3.11+
- **LLM Gateway**: LiteLLM 1.57.2 (unified multi-provider interface)
- **Streaming**: FastAPI `StreamingResponse` with manual SSE framing
- **Configuration**: pydantic-settings 2.7.1 for type-safe env loading
- **Model Registry**: PyYAML 6.0.2 for `models.yaml` parsing
- **Server**: Uvicorn with async support

#### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui component library + @tailwindcss/typography
- **Markdown**: react-markdown with remark-gfm for assistant response rendering
- **State Management**: React `useState` / `useRef` hooks
- **SSE Client**: Native `fetch()` with `ReadableStream` for SSE parsing

#### Deployment

- **Docker**: Multi-stage Dockerfiles for both services
- **docker-compose**: Single-command local dev and deployment
- **Backend**: standalone Uvicorn container on port 8000
- **Frontend**: standalone Next.js container on port 3000

### 7.3 Performance Requirements

- **Streaming latency**: Time-to-first-token depends on the underlying model provider; MooBox adds minimal overhead (~10ms for SSE framing)
- **Concurrent models**: Two parallel streams per request via asyncio tasks
- **API latency**: `GET /api/models` < 50ms (in-memory registry lookup)

## 8. Privacy & Security

### 8.1 Security Measures

- **API keys**: Stored in environment variables, referenced by name in `models.yaml` — never committed to source
- **CORS**: Configurable allowed origins (default: `http://localhost:3000`)
- **No persistence**: Messages are in-memory per browser session; nothing is stored server-side

### 8.2 Privacy

- **User data**: Prompts and responses exist only in the browser and in-flight to model providers
- **Third-party**: Prompts are sent to whichever LLM providers are configured (Groq, OpenAI, Anthropic, Google, or internal endpoints)
- **Recommendation**: Add auth and audit logging before production deployment

## 9. Qualitative Assessment Framework

MooBox supports multiple complementary approaches for evaluating LLM outputs. These range from what is available today to planned capabilities.

### 9.1 Latency Measurement (Implemented)

Real-time performance metrics are measured server-side and displayed per panel after each response completes:

- **Time to First Token (TTFT)**: Milliseconds from request to first streamed token — measures model startup latency
- **Total Response Time**: Wall-clock duration from request to final token
- **Token Count**: Number of streamed chunks received (approximates output tokens)
- **Tokens per Second**: Throughput rate (token_count / total_time)

These metrics appear in the panel header, enabling direct latency comparison between models. The backend emits a `metrics` SSE event at the end of each model's stream containing `ttft_ms`, `total_ms`, `token_count`, and `tokens_per_sec`.

### 9.2 Visual Side-by-Side Comparison (Implemented)

The core evaluation method: users read both responses simultaneously and assess quality, tone, accuracy, and formatting by inspection. Markdown rendering ensures assistant outputs display faithfully (headings, code blocks, tables, lists).

### 9.3 Blind Evaluation / Voting (Planned — Phase 4)

To eliminate name bias ("GPT-4 is probably better"), blind mode would:

- Randomize which model appears in the left vs right panel
- Hide model names, labeling panels as "Model A" and "Model B"
- After both responses complete, prompt the user to pick a winner (Left / Right / Tie)
- Reveal model identities after the vote is submitted
- Store votes for aggregate win-rate analysis

### 9.4 Parameter Tuning (Planned — Phase 5)

Allow per-model parameter overrides to isolate the effect of settings on output quality:

- Temperature, top-p, max tokens, presence/frequency penalty
- Custom system prompt per panel
- This enables "same model, different settings" comparisons alongside "different model" comparisons

### 9.5 Structured Ratings & Export (Planned — Phase 7)

For systematic evaluation campaigns:

- **Per-response ratings**: Thumbs up/down, or Likert scale (1-5) on axes like accuracy, helpfulness, tone, and safety
- **Annotations**: Free-text notes attached to specific responses
- **Export**: CSV/JSON export of prompts, responses, ratings, and metadata for offline analysis
- **Rubrics**: Predefined evaluation criteria that guide raters for consistent scoring

### 9.6 Aggregate Analytics (Planned — Phase 6+)

Once persistence and ratings are in place:

- Win-rate dashboards per model pair
- TTFT / throughput comparison charts across models
- Evaluation trends over time (e.g., "Moo 7B v2 improved 15% on coding tasks vs v1")
- Filter by prompt category, evaluator, or date range

## 10. Success Metrics

### 10.1 Technical Metrics

- Backend health check uptime
- SSE stream reliability (successful completions vs errors)
- Time-to-first-token per model (measurable via SSE timestamps)

### 10.2 User Metrics

- Number of side-by-side comparison sessions (when tracking added)
- Model pairs most frequently compared
- Qualitative feedback from evaluation teams (future: structured ratings)

## 11. Phases & Roadmap


| Phase       | Scope                                                                 | Status  |
| ----------- | --------------------------------------------------------------------- | ------- |
| **Phase 1** | Backend scaffold: FastAPI, LiteLLM, model registry, SSE streaming     | Done    |
| **Phase 2** | Frontend: Next.js, side-by-side UI, SSE client, model selectors       | Done    |
| **Phase 3** | Docker: Dockerfiles, docker-compose, standalone Next.js output        | Done    |
| **Phase 3.5** | Latency measurement: TTFT, total time, tokens/sec per panel        | Done    |
| **Phase 4** | Blind evaluation / voting (hide model names, user picks winner)       | Planned |
| **Phase 5** | Parameter tuning UI (temperature, top-p, system prompt per model)     | Planned |
| **Phase 6** | Persistent conversation history (database-backed sessions)            | Planned |
| **Phase 7** | Structured ratings & export (thumbs up/down, Likert, CSV/JSON export) | Planned |
| **Phase 8** | Auth / user identity (track who evaluated what)                       | Planned |


## 12. Open Questions & Risks

### Questions Addressed

- LLM gateway approach → LiteLLM for unified multi-provider access
- Streaming protocol → SSE with panel-tagged multiplexing
- Model configuration → YAML-based registry with env var references

### Remaining Questions

- Should blind evaluation randomize panel assignment per prompt?
- How to handle models with very different response latencies (one finishes much earlier)?
- Database choice for persistent conversation history (PostgreSQL vs SQLite)?

### Risks & Mitigation


| Risk                            | Mitigation                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| Model provider outage           | Per-panel error handling; one panel can fail independently   |
| LiteLLM version incompatibility | Pin version in requirements.txt; test upgrades               |
| High latency on in-house models | Streaming mitigates perceived wait; show time-to-first-token |


## 13. Constraints

### Technical Constraints

- **LLM providers**: Dependent on external API availability and rate limits
- **Streaming**: SSE is HTTP/1.1-based; some proxies may buffer chunks
- **In-memory state**: Conversations are lost on page refresh (by design for v1)

### Business Constraints

- **MVP scope**: Side-by-side comparison only; no evaluation framework yet
- **Internal tool**: No public-facing deployment; assumes trusted network

## 14. Future Enhancements

- Blind evaluation mode with anonymous model labeling and voting
- Parameter tuning panel (temperature, top-p, max tokens, system prompt)
- Persistent conversation history with session management
- Structured feedback collection (ratings, annotations, export)
- Aggregate analytics dashboards (win-rates, latency charts, trends)
- User authentication and team-based access control
- Multi-model arena (3+ models simultaneously)

## Document Control

| Version | Date       | Changes                                                       |
| ------- | ---------- | ------------------------------------------------------------- |
| 0.1.0   | 2026-03-03 | Initial implementation; PRD reflects built v1 features        |
| 0.2.0   | 2026-03-05 | Added Groq models, Markdown rendering, streaming fix, logging |
| 0.3.0   | 2026-03-06 | Added latency measurement; new Section 9 qualitative assessment framework |


