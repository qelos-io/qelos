from __future__ import annotations

import json
from typing import Any, Dict, List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlManagePlugins(BaseSDK):
    """Admin plugin management: CRUD operations on plugins."""

    _relative_path = "/api/plugins"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def create(self, plugin_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new plugin."""
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(plugin_data),
        )

    async def update(self, plugin_id: str, plugin_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a plugin."""
        return await self.call_json_api(
            f"{self._relative_path}/{plugin_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(plugin_data),
        )

    async def remove(self, plugin_id: str) -> None:
        """Delete a plugin."""
        await self.call_api(f"{self._relative_path}/{plugin_id}", method="DELETE")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all plugins."""
        return await self.call_json_api(self._relative_path)

    async def get_by_id(self, plugin_id: str) -> Dict[str, Any]:
        """Get a plugin by ID."""
        return await self.call_json_api(f"{self._relative_path}/{plugin_id}")
