from __future__ import annotations

from typing import Any, Dict, List, Optional
import json

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class ThreadsSDK(BaseSDK):
    """Thread CRUD operations for managing AI conversation threads."""

    _relative_path = "/api/ai"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new thread.

        Args:
            data: Dict with ``integration`` (required) and optional ``title``.
        """
        return await self.call_json_api(
            self._relative_path + "/threads",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def get_one(self, thread_id: str) -> Dict[str, Any]:
        """Get a specific thread by ID."""
        return await self.call_json_api(
            f"{self._relative_path}/threads/{thread_id}{self.get_query_params({})}"
        )

    async def list(self, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List threads with optional filters.

        Supported filters: ``integration``, ``limit``, ``page``, ``sort``,
        ``user``, ``workspace``.
        """
        qs = self.get_query_params(options)
        return await self.call_json_api(f"{self._relative_path}/threads{qs}")

    async def delete(self, thread_id: str) -> Dict[str, Any]:
        """Delete a thread by ID.

        Returns:
            Dict with ``success`` boolean.
        """
        return await self.call_json_api(
            f"{self._relative_path}/threads/{thread_id}{self.get_query_params({})}",
            method="DELETE",
        )
