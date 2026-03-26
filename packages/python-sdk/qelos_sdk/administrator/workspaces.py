from __future__ import annotations

import json
from typing import Any, Dict, List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlAdminWorkspaces(BaseSDK):
    """Admin workspace management with encrypted data support."""

    _relative_path = "/api/workspaces"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all workspaces (admin view)."""
        return await self.call_json_api(self._relative_path + "/all")

    async def get_encrypted_data(self, workspace_id: str, encrypted_id: str = "") -> Any:
        """Get encrypted data for a workspace."""
        return await self.call_json_api(
            f"{self._relative_path}/{workspace_id}/encrypted",
            headers={"x-encrypted-id": encrypted_id},
        )

    async def set_encrypted_data(self, workspace_id: str, encrypted_id: str = "", data: Any = None) -> None:
        """Set encrypted data for a workspace."""
        response = await self.call_api(
            f"{self._relative_path}/{workspace_id}/encrypted",
            method="POST",
            headers={"content-type": "application/json", "x-encrypted-id": encrypted_id},
            body=json.dumps(data),
        )
        if response.status_code >= 300:
            raise Exception("could not set encrypted data")
