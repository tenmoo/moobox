from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator

import litellm

from app.models_registry import ModelEntry

litellm.drop_params = True


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

    try:
        response = await litellm.acompletion(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                payload = json.dumps({"panel": panel, "delta": delta})
                yield f"data: {payload}\n\n"
    except Exception as exc:
        error_payload = json.dumps({"panel": panel, "error": str(exc)})
        yield f"data: {error_payload}\n\n"


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
