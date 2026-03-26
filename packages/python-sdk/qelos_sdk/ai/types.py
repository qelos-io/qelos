from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union


@dataclass
class Message:
    """A chat message."""

    role: str
    content: str
    timestamp: Optional[str] = None
    tool_calls: Optional[List[Any]] = None
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    function_call: Optional[Any] = None
    message_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"role": self.role, "content": self.content}
        for attr in ("timestamp", "tool_calls", "name", "tool_call_id", "function_call", "message_id"):
            val = getattr(self, attr)
            if val is not None:
                d[attr] = val
        return d


@dataclass
class ClientTool:
    """A client-side tool definition for chat completions."""

    name: str
    description: str
    schema: Optional[Any] = None
