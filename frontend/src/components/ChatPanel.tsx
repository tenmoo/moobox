"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@/lib/types";

interface ChatPanelProps {
  modelName: string;
  messages: Message[];
  isStreaming: boolean;
}

export function ChatPanel({ modelName, messages, isStreaming }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b px-4 py-2">
        <h3 className="text-sm font-semibold truncate">{modelName}</h3>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Responses will appear here.
            </p>
          )}
          {messages.map((msg, i) => {
            const isLast =
              i === messages.length - 1 && msg.role === "assistant";
            return (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isLast && isStreaming}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
