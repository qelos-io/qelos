from __future__ import annotations

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions
from .agents import AgentsSDK
from .chat import ChatSDK, SSEStreamProcessor
from .rag import RagSDK
from .threads import ThreadsSDK
from .types import ClientTool, Message


class QlAI(BaseSDK):
    """Qelos AI SDK with threads, chat, rag, and agents.

    Example::

        # Create a thread
        thread = await sdk.ai.threads.create({"integration": "id"})

        # Agent chat
        reply = await sdk.ai.agents.chat("agent-id", "Hello")

        # Stream chat
        processor = await sdk.ai.chat.stream("id", {"messages": [...]})
        async for chunk in processor:
            print(chunk)

        # Upload RAG content
        await sdk.ai.rag.upload_content("source_id", {"content": "..."})
    """

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)
        self.threads = ThreadsSDK(options)
        self.chat = ChatSDK(options)
        self.rag = RagSDK(options)
        self.agents = AgentsSDK(options, self.chat)


__all__ = [
    "QlAI",
    "AgentsSDK",
    "ThreadsSDK",
    "ChatSDK",
    "RagSDK",
    "SSEStreamProcessor",
    "Message",
    "ClientTool",
]
