from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.llm import stream_dual

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    left_model: str
    right_model: str


@router.post("/chat")
async def chat(request: Request, body: ChatRequest):
    registry = request.app.state.registry

    left_entry = registry.get(body.left_model)
    if not left_entry:
        raise HTTPException(404, f"Model not found: {body.left_model}")

    right_entry = registry.get(body.right_model)
    if not right_entry:
        raise HTTPException(404, f"Model not found: {body.right_model}")

    messages = [m.model_dump() for m in body.messages]

    return StreamingResponse(
        stream_dual(left_entry, right_entry, messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
