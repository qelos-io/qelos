from __future__ import annotations

from typing import Any

from .base_sdk import BaseSDK, QelosAPIError
from .types import QelosSDKOptions


class QlPermissions(BaseSDK):
    """Permission checks for the current principal (app-level SDK surface)."""

    _relative_path = "/api/permissions"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def check(self, permission: str) -> bool:
        """Return whether the current caller has the given permission key."""
        qs = self.get_query_params({"permission": permission})
        data = await self.call_json_api(f"{self._relative_path}/check{qs}")

        if isinstance(data, bool):
            return data
        if isinstance(data, dict):
            for key in ("allowed", "ok", "permitted", "hasPermission"):
                if key in data:
                    return bool(data[key])
            raise QelosAPIError("Unexpected permissions check response shape", details=data)
        raise QelosAPIError("Unexpected permissions check response type", details=data)

    async def get_user_permissions(self) -> Any:
        """Return permission descriptors for the current user (backend-specific shape)."""
        return await self.call_json_api(self._relative_path)
