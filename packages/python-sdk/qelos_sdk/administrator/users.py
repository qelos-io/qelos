from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlUsers(BaseSDK):
    """Admin user management: CRUD, encrypted data, and user listing with filters."""

    _relative_path = "/api/users"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """Get a user by ID."""
        return await self.call_json_api(f"{self._relative_path}/{user_id}")

    async def get_list(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List users with optional filters.

        Supported filters: ``username``, ``exact``, ``roles`` (list of strings).
        """
        qs = ""
        if filters:
            parts = []
            for key, value in filters.items():
                if isinstance(value, list):
                    parts.append(f"{key}={','.join(str(v) for v in value)}")
                else:
                    parts.append(f"{key}={value}")
            qs = "?" + "&".join(parts)
        return await self.call_json_api(f"{self._relative_path}{qs}")

    async def remove(self, user_id: str) -> Any:
        """Delete a user by ID."""
        return await self.call_api(f"{self._relative_path}/{user_id}", method="DELETE")

    async def update(self, user_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update a user. Changes may include ``password``."""
        return await self.call_json_api(
            f"{self._relative_path}/{user_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user.

        Args:
            user: Dict with ``username``, ``email``, ``firstName``, ``lastName``,
                ``roles``, ``metadata``, and optional ``password``, ``internalMetadata``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(user),
        )

    async def get_encrypted_data(self, user_id: str, encrypted_id: str = "") -> Any:
        """Get encrypted data for a user."""
        return await self.call_json_api(
            f"{self._relative_path}/{user_id}/encrypted",
            headers={"x-encrypted-id": encrypted_id},
        )

    async def set_encrypted_data(self, user_id: str, encrypted_id: str = "", data: Any = None) -> None:
        """Set encrypted data for a user."""
        response = await self.call_api(
            f"{self._relative_path}/{user_id}/encrypted",
            method="POST",
            headers={"content-type": "application/json", "x-encrypted-id": encrypted_id},
            body=json.dumps(data),
        )
        if response.status_code >= 300:
            raise Exception("could not set encrypted data")
