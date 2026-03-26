from __future__ import annotations

import json
from typing import Any, Dict, List

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class InviteKind:
    DECLINE = "decline"
    ACCEPT = "accept"


class QlInvites(BaseSDK):
    """Workspace invite management: list, accept, and decline invites."""

    _relative_path = "/api/invites"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_list(self) -> List[Dict[str, Any]]:
        """List pending invites for the current user."""
        return await self.call_json_api(self._relative_path)

    async def accept_workspace(self, workspace_id: str) -> Any:
        """Accept a workspace invite."""
        return await self.call_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps({"workspace": workspace_id, "kind": InviteKind.ACCEPT}),
        )

    async def decline_workspace(self, workspace_id: str) -> Any:
        """Decline a workspace invite."""
        return await self.call_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps({"workspace": workspace_id, "kind": InviteKind.DECLINE}),
        )
