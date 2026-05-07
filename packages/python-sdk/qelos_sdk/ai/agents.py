from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions
from .chat import ChatSDK, SSEStreamProcessor


class AgentsSDK(BaseSDK):
    """AI agents: list, fetch, and agent-centric chat (mirrors TS ``AgentsSDK``)."""

    _relative_path = "/api/ai/agents"

    def __init__(self, options: QelosSDKOptions, chat_sdk: ChatSDK) -> None:
        super().__init__(options)
        self._chat = chat_sdk

    async def list(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List available AI agents."""
        qs = self.get_query_params(query)
        return await self.call_json_api(f"{self._relative_path}{qs}")

    async def get(self, agent_id: str) -> Dict[str, Any]:
        """Get a specific agent by ID."""
        return await self.call_json_api(f"{self._relative_path}/{agent_id}{self.get_query_params({})}")

    async def chat(
        self,
        agent_id: str,
        message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send a single message to an agent and get the completion response."""
        built = self._build_chat_options(message, dict(options or {}))
        return await self._chat.chat(agent_id, built)

    async def stream_chat(
        self,
        agent_id: str,
        message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> SSEStreamProcessor:
        """Stream a response from an agent for a single message."""
        built = self._build_chat_options(message, dict(options or {}))
        return await self._chat.stream(agent_id, built)

    async def chat_in_thread(
        self,
        agent_id: str,
        thread_id: str,
        message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Continue a conversation in an existing thread."""
        built = self._build_chat_options(message, dict(options or {}))
        return await self._chat.chat_in_thread(agent_id, thread_id, built)

    async def stream_chat_in_thread(
        self,
        agent_id: str,
        thread_id: str,
        message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> SSEStreamProcessor:
        """Stream a response within an existing thread."""
        built = self._build_chat_options(message, dict(options or {}))
        return await self._chat.stream_in_thread(agent_id, thread_id, built)

    @staticmethod
    def _build_chat_options(message: str, options: Dict[str, Any]) -> Dict[str, Any]:
        history = options.pop("history", None) or []
        messages = [*history, {"role": "user", "content": message}]
        return {**options, "messages": messages}
