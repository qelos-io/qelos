from __future__ import annotations

import json
from typing import Any, Dict, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlLambdas(BaseSDK):
    """Webhook / lambda execution: GET, POST, PUT, DELETE on integration webhooks."""

    _relative_path = "/api/webhooks"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def execute(self, integration_id: str, **kwargs: Any) -> Any:
        """Execute a webhook (default GET)."""
        return await self.call_json_api(f"{self._relative_path}/{integration_id}", **kwargs)

    async def get(self, integration_id: str, **kwargs: Any) -> Any:
        """GET request to a webhook."""
        return await self.call_json_api(f"{self._relative_path}/{integration_id}", **kwargs)

    async def post(self, integration_id: str, data: Optional[Any] = None) -> Any:
        """POST request to a webhook."""
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data) if data is not None else None,
        )

    async def put(self, integration_id: str, data: Optional[Any] = None) -> Any:
        """PUT request to a webhook."""
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(data) if data is not None else None,
        )

    async def delete(self, integration_id: str, **kwargs: Any) -> Any:
        """DELETE request to a webhook."""
        return await self.call_json_api(
            f"{self._relative_path}/{integration_id}",
            method="DELETE",
            **kwargs,
        )
