"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChatPanel } from "@/components/ChatPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { fetchModels, streamChat } from "@/lib/api";
import { Message, ModelInfo } from "@/lib/types";

export default function Home() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [leftModel, setLeftModel] = useState("");
  const [rightModel, setRightModel] = useState("");
  const [leftMessages, setLeftMessages] = useState<Message[]>([]);
  const [rightMessages, setRightMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<Message[]>([]);

  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        if (m.length >= 2) {
          setLeftModel(m[0].id);
          setRightModel(m[1].id);
        } else if (m.length === 1) {
          setLeftModel(m[0].id);
          setRightModel(m[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!leftModel || !rightModel) return;

      const userMsg: Message = { role: "user", content: text };
      conversationRef.current = [...conversationRef.current, userMsg];

      setLeftMessages((prev) => [...prev, userMsg]);
      setRightMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const leftAssistant: Message = { role: "assistant", content: "" };
      const rightAssistant: Message = { role: "assistant", content: "" };

      setLeftMessages((prev) => [...prev, { ...leftAssistant }]);
      setRightMessages((prev) => [...prev, { ...rightAssistant }]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          {
            messages: conversationRef.current,
            left_model: leftModel,
            right_model: rightModel,
          },
          (delta) => {
            if (delta.panel === "left") {
              if (delta.error) {
                leftAssistant.content += `\n[Error: ${delta.error}]`;
              } else if (delta.delta) {
                leftAssistant.content += delta.delta;
              }
              setLeftMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...leftAssistant };
                return next;
              });
            } else {
              if (delta.error) {
                rightAssistant.content += `\n[Error: ${delta.error}]`;
              } else if (delta.delta) {
                rightAssistant.content += delta.delta;
              }
              setRightMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...rightAssistant };
                return next;
              });
            }
          },
          () => {
            setIsStreaming(false);
            conversationRef.current = [
              ...conversationRef.current,
              { role: "assistant", content: leftAssistant.content },
            ];
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Stream error:", err);
        }
        setIsStreaming(false);
      }
    },
    [leftModel, rightModel],
  );

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setLeftMessages([]);
    setRightMessages([]);
    setIsStreaming(false);
    conversationRef.current = [];
  }, []);

  const leftName =
    (models.find((m) => m.id === leftModel)?.name ?? leftModel) || "Model A";
  const rightName =
    (models.find((m) => m.id === rightModel)?.name ?? rightModel) || "Model B";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-bold tracking-tight">MooBox</h1>
          <button
            onClick={handleNewChat}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            New chat
          </button>
        </div>
      </header>

      {/* Model selectors */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-3 border-b bg-muted/30">
        <ModelSelector
          models={models}
          value={leftModel}
          onChange={setLeftModel}
          label="Left"
          disabled={isStreaming}
        />
        <ModelSelector
          models={models}
          value={rightModel}
          onChange={setRightModel}
          label="Right"
          disabled={isStreaming}
        />
      </div>

      {/* Chat panels */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-x">
        <Card className="rounded-none border-0 flex flex-col min-h-0">
          <ChatPanel
            modelName={leftName}
            messages={leftMessages}
            isStreaming={isStreaming}
          />
        </Card>
        <Card className="rounded-none border-0 flex flex-col min-h-0">
          <ChatPanel
            modelName={rightName}
            messages={rightMessages}
            isStreaming={isStreaming}
          />
        </Card>
      </div>

      {/* Prompt input */}
      <PromptInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
