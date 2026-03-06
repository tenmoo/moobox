"use client";

import { LatencyMetrics } from "@/lib/types";

interface LatencyBarProps {
  metrics: LatencyMetrics;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function LatencyBar({ metrics }: LatencyBarProps) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
      <span title="Time to first token">
        TTFT {formatMs(metrics.ttft_ms)}
      </span>
      <span className="text-border">|</span>
      <span title="Total response time">
        {formatMs(metrics.total_ms)}
      </span>
      <span className="text-border">|</span>
      <span title="Tokens per second">
        {metrics.tokens_per_sec} tok/s
      </span>
      <span className="text-border">|</span>
      <span title="Total tokens received">
        {metrics.token_count} tokens
      </span>
    </div>
  );
}
