import { ChatRequest, ModelInfo, StreamDelta } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_URL}/api/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  const data = await res.json();
  return data.models;
}

export async function streamChat(
  body: ChatRequest,
  onDelta: (d: StreamDelta) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        onDone();
        return;
      }
      try {
        const delta: StreamDelta = JSON.parse(payload);
        onDelta(delta);
      } catch {
        // skip malformed events
      }
    }
  }

  onDone();
}
