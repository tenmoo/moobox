# MooBox - API Documentation

Complete API reference for the MooBox backend.

## Base URL

- **Development**: `http://localhost:8000`
- **Docker Compose**: `http://localhost:8000`

## API Prefix

All endpoints are prefixed with `/api`.

---

## Endpoints

### Models

#### GET /api/models

List all available models from the registry.

**Response:** `200 OK`
```json
{
  "models": [
    {
      "id": "internal/moo-7b",
      "name": "Moo 7B",
      "provider": "openai"
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "provider": "openai"
    },
    {
      "id": "claude-sonnet-4-20250514",
      "name": "Claude Sonnet",
      "provider": "anthropic"
    },
    {
      "id": "gemini/gemini-2.0-flash",
      "name": "Gemini 2.0 Flash",
      "provider": "gemini"
    }
  ]
}
```

---

### Chat

#### POST /api/chat

Stream side-by-side completions from two models via Server-Sent Events (SSE).

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Explain quicksort in simple terms" }
  ],
  "left_model": "gpt-4o",
  "right_model": "claude-sonnet-4-20250514"
}
```

**Fields:**
- `messages` (array, required): Conversation history as `{role, content}` objects
- `left_model` (string, required): Model ID for the left panel (must exist in registry)
- `right_model` (string, required): Model ID for the right panel (must exist in registry)

**Response:** `200 OK` — `text/event-stream`

SSE events are tagged by panel:
```
data: {"panel": "left", "delta": "Quick"}
data: {"panel": "right", "delta": "Sure"}
data: {"panel": "left", "delta": "sort is"}
data: {"panel": "right", "delta": ", quicksort"}
data: {"panel": "left", "delta": " a sorting algorithm..."}
data: {"panel": "right", "delta": " works by picking..."}
data: [DONE]
```

Each event is one of:
- **Delta**: `{"panel": "left" | "right", "delta": "text chunk"}`
- **Error**: `{"panel": "left" | "right", "error": "error message"}`
- **Done**: `[DONE]` — signals end of stream

**Errors:**
- `404`: Model not found in registry
- `422`: Invalid request body (missing fields, wrong types)

---

## Data Models

### ModelInfo

```typescript
interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}
```

### Message

```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
}
```

### ChatRequest

```typescript
interface ChatRequest {
  messages: Message[];
  left_model: string;
  right_model: string;
}
```

### StreamDelta

```typescript
interface StreamDelta {
  panel: "left" | "right";
  delta?: string;
  error?: string;
}
```

---

## Error Responses

All error responses follow the FastAPI default format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200 OK` | Request succeeded |
| `404 Not Found` | Model ID not found in registry |
| `422 Unprocessable Entity` | Invalid request body |
| `500 Internal Server Error` | Server error |

---

## Testing the API

### Using cURL

**List models:**
```bash
curl http://localhost:8000/api/models
```

**Stream side-by-side chat:**
```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is recursion?"}],
    "left_model": "gpt-4o",
    "right_model": "claude-sonnet-4-20250514"
  }'
```

The `-N` flag disables output buffering so you see SSE events in real time.

### Using Python

```python
import requests
import json

# List models
models = requests.get("http://localhost:8000/api/models").json()
print(f"Available models: {[m['name'] for m in models['models']]}")

# Stream side-by-side chat
response = requests.post(
    "http://localhost:8000/api/chat",
    json={
        "messages": [{"role": "user", "content": "What is recursion?"}],
        "left_model": "gpt-4o",
        "right_model": "claude-sonnet-4-20250514",
    },
    stream=True,
)

for line in response.iter_lines():
    if line:
        decoded = line.decode("utf-8")
        if decoded.startswith("data:"):
            payload = decoded[5:].strip()
            if payload == "[DONE]":
                break
            event = json.loads(payload)
            panel = event.get("panel", "?")
            delta = event.get("delta", "")
            print(f"[{panel}] {delta}", end="", flush=True)
```

### Using Swagger UI

Visit `http://localhost:8000/docs` for interactive API documentation where you can test all endpoints.

---

## CORS

The API supports CORS with configurable origins. Default allows `http://localhost:3000`. Set `CORS_ORIGINS` environment variable to a comma-separated list for additional origins.

---

## Model Registry

Models are loaded from `backend/models.yaml` at startup. To add a model:

1. Add an entry to `models.yaml`:
```yaml
- id: "your-model-id"
  name: "Display Name"
  provider: "openai"
  api_key_env: "YOUR_API_KEY_ENV_VAR"
  api_base_env: "YOUR_API_BASE_ENV_VAR"  # optional, for custom endpoints
```

2. Set the corresponding environment variables in `.env`

3. Restart the backend
