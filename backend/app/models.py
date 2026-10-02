from typing import Literal
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: Literal["user","assistant","model"]
    content: str = Field(min_length=1, max_length=100000)

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    language: str = "English"
    conversation_id: str | None = None

class ToolResult(BaseModel):
    name: str
    result: dict
