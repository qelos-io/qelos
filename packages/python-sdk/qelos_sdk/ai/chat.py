from __future__ import annotations

import json
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Union

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class SSEStreamProcessor:
    """Processes a Server-Sent Events stream from an httpx response.

    Supports both async iteration and manual callback-based processing.

    Example using async iteration::

        async for chunk in processor:
            print(chunk)

    Example using manual processing::

        await processor.process_manually(lambda data: print(data))
    """

    def __init__(self, response) -> None:
        self._response = response

    async def __aiter__(self) -> AsyncIterator[Any]:
        buffer = ""
        async for raw_bytes in self._response.aiter_bytes():
            buffer += raw_bytes.decode("utf-8", errors="replace")
            lines = buffer.split("\n")
            buffer = lines.pop()  # keep incomplete line

            for line in lines:
                line = line.rstrip("\r")
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        return
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        pass

    async def process_manually(self, on_data: Callable[[Any], Optional[bool]]) -> None:
        """Process the stream with a callback.

        Args:
            on_data: Called for each parsed JSON chunk. Return ``False`` to stop.
        """
        async for chunk in self:
            result = on_data(chunk)
            if result is False:
                return


class ChatSDK(BaseSDK):
    """Chat completion operations, both streaming and non-streaming."""

    _relative_path = "/api/ai"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def chat(self, integration_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Create a non-streaming chat completion.

        Args:
            integration_id: The AI integration ID.
            options: Dict with ``messages`` (required) and optional ``model``,
                ``temperature``, ``top_p``, ``frequency_penalty``, ``presence_penalty``,
                ``stop``, ``max_tokens``, ``response_format``, ``context``,
                ``queryParams``, ``clientTools``.
        """
        query_params = self.get_query_params(options.get("queryParams", {}))
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}/chat-completion{query_params}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(options),
        )

    async def chat_in_thread(
        self, integration_id: str, thread_id: str, options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a non-streaming chat completion within a thread."""
        query_params = self.get_query_params(options.get("queryParams", {}))
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}/chat-completion/{thread_id}{query_params}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(options),
        )

    async def stream(self, integration_id: str, options: Dict[str, Any]) -> SSEStreamProcessor:
        """Create a streaming chat completion.

        Returns an :class:`SSEStreamProcessor` that can be async-iterated.

        Example::

            processor = await sdk.ai.chat.stream("integration-id", {"messages": [...]})
            async for chunk in processor:
                print(chunk)
        """
        query_params = self.get_query_params({**(options.get("queryParams") or {}), "stream": "true"})
        response = await self.call_api(
            f"{self._relative_path}/{integration_id}/chat-completion{query_params}",
            method="POST",
            headers={"content-type": "application/json", "accept": "text/event-stream"},
            body=json.dumps({**options, "stream": True}),
        )
        if not response.is_success:
            raise Exception(f"HTTP {response.status_code}: {response.reason_phrase}")
        return SSEStreamProcessor(response)

    async def stream_in_thread(
        self, integration_id: str, thread_id: str, options: Dict[str, Any]
    ) -> SSEStreamProcessor:
        """Create a streaming chat completion within a thread."""
        query_params = self.get_query_params({**(options.get("queryParams") or {}), "stream": "true"})
        response = await self.call_api(
            f"{self._relative_path}/{integration_id}/chat-completion/{thread_id}{query_params}",
            method="POST",
            headers={"content-type": "application/json", "accept": "text/event-stream"},
            body=json.dumps({**options, "stream": True}),
        )
        if not response.is_success:
            raise Exception(f"HTTP {response.status_code}: {response.reason_phrase}")
        return SSEStreamProcessor(response)
