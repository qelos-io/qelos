from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions, RequestExtra


class QlManageConfigurations(BaseSDK):
    """Admin custom configuration management."""

    _relative_path = "/api/configurations"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_list(self, key: str, extra: Optional[RequestExtra] = None) -> List[Dict[str, Any]]:
        """List all configurations."""
        return await self.call_json_api(
            self._relative_path,
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def get_configuration(self, key: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get a configuration by key."""
        return await self.call_json_api(
            f"{self._relative_path}/{key}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def create(self, config: Dict[str, Any], extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Create a new configuration.

        Args:
            config: Dict with ``key``, ``public``, ``metadata``, and optional ``kind``, ``description``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(config),
            timeout=extra.timeout if extra else None,
        )

    async def update(self, key: str, changes: Dict[str, Any], extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Update a configuration by key."""
        return await self.call_json_api(
            f"{self._relative_path}/{key}",
            method="PUT",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(changes),
            timeout=extra.timeout if extra else None,
        )

    async def remove(self, key: str, extra: Optional[RequestExtra] = None) -> Any:
        """Delete a configuration by key."""
        return await self.call_json_api(
            f"{self._relative_path}/{key}",
            method="DELETE",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )
