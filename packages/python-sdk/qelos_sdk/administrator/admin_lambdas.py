from __future__ import annotations

import json
from typing import Any, Dict, List

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlManageLambdas(BaseSDK):
    """Admin lambda/serverless function management."""

    _relative_path = "/api/lambdas"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_list(self, source_id: str) -> List[Any]:
        """List lambdas for a source."""
        return await self.call_json_api(f"{self._relative_path}/{source_id}")

    async def get_lambda(self, source_id: str, function_name: str) -> Any:
        """Get a specific lambda."""
        return await self.call_json_api(f"{self._relative_path}/{source_id}/{function_name}")

    async def create(self, source_id: str, data: Any) -> Any:
        """Create a new lambda."""
        return await self.call_json_api(
            f"{self._relative_path}/{source_id}",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def update(self, source_id: str, function_name: str, data: Any) -> Any:
        """Update a lambda."""
        return await self.call_json_api(
            f"{self._relative_path}/{source_id}/{function_name}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def remove(self, source_id: str, function_name: str) -> Any:
        """Delete a lambda."""
        return await self.call_api(
            f"{self._relative_path}/{source_id}/{function_name}", method="DELETE"
        )
