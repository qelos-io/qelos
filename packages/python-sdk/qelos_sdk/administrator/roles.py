from __future__ import annotations

from typing import List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlRoles(BaseSDK):
    """Admin role management."""

    _relative_path = "/api/roles"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_existing_roles(self) -> List[str]:
        """Get all existing roles."""
        return await self.call_json_api(self._relative_path)
