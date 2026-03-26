from __future__ import annotations

import json
from typing import Any, Dict, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions, RequestExtra


class QlAppConfigurations(BaseSDK):
    """Application configuration management."""

    _relative_path = "/api/configurations/app-configuration"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_app_configuration(self, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get the application configuration."""
        return await self.call_json_api(
            self._relative_path,
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def update(self, changes: Dict[str, Any], extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Update the application configuration metadata."""
        return await self.call_json_api(
            self._relative_path,
            method="PUT",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps({"metadata": changes}),
            timeout=extra.timeout if extra else None,
        )
