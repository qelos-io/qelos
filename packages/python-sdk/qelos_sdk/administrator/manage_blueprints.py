from __future__ import annotations

import json
from typing import Any, Dict, List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlManageBlueprints(BaseSDK):
    """Admin blueprint management: CRUD operations on blueprints."""

    _relative_path = "/api/blueprints"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_blueprint(self, key: str) -> Dict[str, Any]:
        """Get a blueprint by key."""
        return await self.call_json_api(f"{self._relative_path}/{key}")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all blueprints."""
        return await self.call_json_api(self._relative_path)

    async def remove(self, key: str) -> Any:
        """Delete a blueprint by key."""
        return await self.call_api(f"{self._relative_path}/{key}", method="DELETE")

    async def update(self, key: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update a blueprint."""
        return await self.call_json_api(
            f"{self._relative_path}/{key}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, blueprint: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new blueprint."""
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(blueprint),
        )
