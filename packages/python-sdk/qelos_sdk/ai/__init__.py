from __future__ import annotations

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions
from .chat import ChatSDK, SSEStreamProcessor
from .rag import RagSDK
from .threads import ThreadsSDK
from .types import ClientTool, Message


class QlAI(BaseSDK):
    """Qelos AI SDK with three sub-SDKs: threads, chat, and rag.

    Example::

        # Create a thread
        thread = await sdk.ai.threads.create({"integration": "id"})

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


__all__ = [
    "QlAI",
    "ThreadsSDK",
    "ChatSDK",
    "RagSDK",
    "SSEStreamProcessor",
    "Message",
    "ClientTool",
]
