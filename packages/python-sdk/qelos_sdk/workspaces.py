from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlWorkspaces(BaseSDK):
    """Workspace management: create, list, update, remove, and activate workspaces."""

    _relative_path = "/api/workspaces"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_workspace(self, workspace_id: str) -> Dict[str, Any]:
        """Get a workspace by ID."""
        return await self.call_json_api(f"{self._relative_path}/{workspace_id}")

    async def get_members(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Get members of a workspace."""
        return await self.call_json_api(f"{self._relative_path}/{workspace_id}/members")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all workspaces for the current user."""
        return await self.call_json_api(self._relative_path)

    async def remove(self, workspace_id: str) -> Any:
        """Delete a workspace."""
        return await self.call_api(f"{self._relative_path}/{workspace_id}", method="DELETE")

    async def update(self, workspace_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update a workspace."""
        return await self.call_json_api(
            f"{self._relative_path}/{workspace_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, workspace: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new workspace. Must include a ``name`` field."""
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(workspace),
        )

    async def activate(self, workspace_id: str) -> Dict[str, Any]:
        """Activate a workspace."""
        return await self.call_json_api(
            f"{self._relative_path}/{workspace_id}/activate",
            method="POST",
            headers={"content-type": "application/json"},
        )
