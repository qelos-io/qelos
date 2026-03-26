from __future__ import annotations

import json
from typing import Any, Dict, List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlComponents(BaseSDK):
    """Admin component management: CRUD operations on UI components."""

    _relative_path = "/api/components"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_component(self, component_id: str) -> Dict[str, Any]:
        """Get a component by ID."""
        return await self.call_json_api(f"{self._relative_path}/{component_id}")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all components."""
        return await self.call_json_api(self._relative_path)

    async def remove(self, component_id: str) -> Dict[str, Any]:
        """Delete a component."""
        return await self.call_json_api(f"{self._relative_path}/{component_id}", method="DELETE")

    async def update(self, component_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update a component."""
        return await self.call_json_api(
            f"{self._relative_path}/{component_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, component: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new component.

        Args:
            component: Dict with ``identifier``, ``componentName``, ``content``,
                and optional ``description``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(component),
        )
