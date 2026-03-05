export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  left_model: string;
  right_model: string;
}

export interface StreamDelta {
  panel: "left" | "right";
  delta?: string;
  error?: string;
}
