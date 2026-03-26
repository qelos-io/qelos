from __future__ import annotations

import json
from typing import Any, Dict, List

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlBlocks(BaseSDK):
    """Content blocks management: CRUD operations on content blocks."""

    _relative_path = "/api/blocks"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_block(self, block_id: str) -> Dict[str, Any]:
        """Get a block by ID."""
        return await self.call_json_api(f"{self._relative_path}/{block_id}")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all blocks."""
        return await self.call_json_api(self._relative_path)

    async def remove(self, block_id: str) -> Any:
        """Delete a block."""
        return await self.call_api(f"{self._relative_path}/{block_id}", method="DELETE")

    async def update(self, block_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update a block."""
        return await self.call_json_api(
            f"{self._relative_path}/{block_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )

    async def create(self, block: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new block. Must include ``name`` and ``content`` fields."""
        return await self.call_json_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(block),
        )
