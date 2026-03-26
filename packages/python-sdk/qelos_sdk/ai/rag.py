from __future__ import annotations

import json
from typing import Any, Dict

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class RagSDK(BaseSDK):
    """Vector storage management for Retrieval-Augmented Generation (RAG)."""

    _relative_path = "/api/ai"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def create_storage(self, source_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a vector storage.

        Args:
            source_id: The integration source ID.
            data: Dict with ``integrationId``, ``scope`` (thread/user/workspace/tenant),
                and optional ``subjectId``, ``expirationAfterDays``.

        Returns:
            Dict with ``success``, ``message``, and ``vectorStore``.
        """
        return await self.call_json_api(
            f"{self._relative_path}/sources/{source_id}/storage{self.get_query_params({})}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def upload_content(self, source_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Upload content to vector storage.

        Args:
            source_id: The integration source ID.
            data: Dict with ``content`` (required), and optional ``integrationId``,
                ``vectorStoreId``, ``fileName``, ``metadata``.

        Returns:
            Dict with ``success``, ``message``, ``fileId``, and ``vectorStoreId``.
        """
        return await self.call_json_api(
            f"{self._relative_path}/sources/{source_id}/storage/upload{self.get_query_params({})}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def clear_storage(self, source_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clear files from vector storage.

        Args:
            source_id: The integration source ID.
            data: Dict with optional ``integrationId``, ``vectorStoreId``, ``fileIds``.

        Returns:
            Dict with ``success``, ``message``, ``clearedCount``, and ``vectorStoreId``.
        """
        return await self.call_json_api(
            f"{self._relative_path}/sources/{source_id}/storage/clear{self.get_query_params({})}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )
