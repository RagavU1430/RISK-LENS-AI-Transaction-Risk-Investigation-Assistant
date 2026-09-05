"""Assistant chatbot API (grounded in site data, explanation only).

The browser posts a message; the backend answers via Gemini using only
deterministic site data. The API key never leaves the server.
"""

from fastapi import APIRouter

from backend.models import ChatRequest, ChatResponse
from backend.services.ai.chatbot import chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest) -> ChatResponse:
    result = chat(body.message,
                  [item.model_dump() for item in body.history],
                  body.investigation_id)
    return ChatResponse(status=result["status"], reply=result.get("reply", ""),
                        model_metadata=result.get("model_metadata", {}))
