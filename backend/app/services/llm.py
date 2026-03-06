from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator

import litellm

from app.models_registry import ModelEntry

litellm.drop_params = True
logger = logging.getLogger(__name__)


async def _stream_one(
    model_entry: ModelEntry,
    messages: list[dict],
    panel: str,
) -> AsyncGenerator[str, None]:
    """Stream completions from a single model, yielding SSE-formatted lines."""
    kwargs: dict = {
        "model": model_entry.id,
        "messages": messages,
        "stream": True,
    }
    if model_entry.api_key:
        kwargs["api_key"] = model_entry.api_key
    if model_entry.api_base:
        kwargs["api_base"] = model_entry.api_base

    logger.info("[%s] Starting stream for model=%s", panel, model_entry.id)
    t0 = time.monotonic()
    ttft: float | None = None
    token_count = 0

    try:
        response = await litellm.acompletion(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                if ttft is None:
                    ttft = time.monotonic() - t0
                token_count += 1
                payload = json.dumps({"panel": panel, "delta": delta})
                yield f"data: {payload}\n\n"
    except Exception as exc:
        logger.error("[%s] LiteLLM error for model=%s: %s", panel, model_entry.id, exc)
        error_payload = json.dumps({"panel": panel, "error": str(exc)})
        yield f"data: {error_payload}\n\n"

    total_s = time.monotonic() - t0
    tps = token_count / total_s if total_s > 0 else 0
    metrics = {
        "panel": panel,
        "metrics": {
            "ttft_ms": round((ttft or total_s) * 1000),
            "total_ms": round(total_s * 1000),
            "token_count": token_count,
            "tokens_per_sec": round(tps, 1),
        },
    }
    logger.info("[%s] Finished model=%s %s", panel, model_entry.id, metrics["metrics"])
    yield f"data: {json.dumps(metrics)}\n\n"


async def stream_dual(
    left_entry: ModelEntry,
    right_entry: ModelEntry,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Multiplex two model streams into a single SSE event stream."""
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    active_tasks = 2

    async def _produce(entry: ModelEntry, panel: str):
        async for event in _stream_one(entry, messages, panel):
            await queue.put(event)
        await queue.put(None)

    left_task = asyncio.create_task(_produce(left_entry, "left"))
    right_task = asyncio.create_task(_produce(right_entry, "right"))

    finished = 0
    try:
        while finished < active_tasks:
            item = await queue.get()
            if item is None:
                finished += 1
                continue
            yield item
    finally:
        left_task.cancel()
        right_task.cancel()

    yield "data: [DONE]\n\n"
