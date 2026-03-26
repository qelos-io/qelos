from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions, RequestExtra


class QlIntegrations(BaseSDK):
    """Admin integration management."""

    _relative_path = "/api/integrations"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_integration(self, integration_id: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get an integration by ID."""
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def get_list(
        self, query: Optional[Dict[str, Any]] = None, extra: Optional[RequestExtra] = None
    ) -> List[Dict[str, Any]]:
        """List integrations with optional filters.

        Supported query fields: ``plugin``, ``user``, ``trigger.source``,
        ``target.source``, ``trigger.kind``, ``target.kind``, ``kind``,
        ``source``, ``active``, ``id``, ``_id``.
        """
        qs = self.get_query_params(query)
        return await self.call_json_api(
            f"{self._relative_path}{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def remove(self, integration_id: str) -> Any:
        """Delete an integration."""
        return await self.call_api(f"{self._relative_path}/{integration_id}", method="DELETE")

    async def update(self, integration_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update an integration (active, trigger, target, dataManipulation)."""
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, integration: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new integration.

        Args:
            integration: Dict with ``trigger``, ``target`` (required), and optional
                ``dataManipulation``, ``active``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(integration),
        )
