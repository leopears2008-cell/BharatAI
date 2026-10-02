from dataclasses import dataclass
from app.config import settings

@dataclass
class ContextPack:
    messages: list[dict]
    summary: str = ""


def build_context(messages, max_chars: int | None = None) -> ContextPack:
    """Keep recent turns while preserving a compact deterministic summary of older turns."""
    budget = max_chars or settings.context_window_chars
    normalized = [{"role": m.role, "content": m.content} for m in messages]
    total = sum(len(x["content"]) for x in normalized)
    if total <= budget:
        return ContextPack(normalized)
    recent=[]; used=0
    for item in reversed(normalized):
        size=len(item["content"])+32
        if used+size>budget:
            break
        recent.append(item); used+=size
    recent.reverse()
    older=normalized[:len(normalized)-len(recent)]
    summary=" ".join(f'{x["role"]}: {x["content"][:240]}' for x in older)[-settings.summary_max_chars:]
    return ContextPack(recent, summary=summary)
