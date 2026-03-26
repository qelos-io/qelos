from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions, RequestExtra


class QlIntegrationSources(BaseSDK):
    """Admin integration source management."""

    _relative_path = "/api/integration-sources"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_integration_source(self, source_id: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get an integration source by ID."""
        return await self.call_json_api(
            f"{self._relative_path}/{source_id}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def get_list(
        self, query: Optional[Dict[str, Any]] = None, extra: Optional[RequestExtra] = None
    ) -> List[Dict[str, Any]]:
        """List integration sources with optional ``kind`` filter."""
        qs = self.get_query_params(query)
        return await self.call_json_api(
            f"{self._relative_path}{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def remove(self, source_id: str) -> Any:
        """Delete an integration source."""
        return await self.call_api(f"{self._relative_path}/{source_id}", method="DELETE")

    async def update(self, source_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update an integration source (name, labels, metadata, authentication)."""
        return await self.call_json_api(
            f"{self._relative_path}/{source_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, source: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new integration source.

        Args:
            source: Dict with ``name``, ``labels``, ``metadata``, ``authentication``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(source),
        )
