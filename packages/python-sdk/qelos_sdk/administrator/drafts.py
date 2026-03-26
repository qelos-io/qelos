from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlDrafts(BaseSDK):
    """Admin draft management for context-based drafts."""

    _relative_path = "/api/drafts"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    def _get_draft_url(self, context_type: Optional[str], context_id: Optional[str]) -> str:
        params: Dict[str, str] = {}
        if context_type:
            params["contextType"] = context_type
        if context_id:
            params["contextId"] = context_id
        qs = "?" + urlencode(params) if params else ""
        return f"{self._relative_path}{qs}"

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all drafts."""
        return await self.call_json_api(self._relative_path)

    async def get_draft(self, context_type: str, context_id: str) -> Dict[str, Any]:
        """Get a draft by context type and context ID."""
        return await self.call_json_api(self._get_draft_url(context_type, context_id))

    async def set_draft(self, draft: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a draft.

        Args:
            draft: Dict with ``contextType``, ``contextData``, and optional
                ``contextDisplayName``, ``contextRouteParams``, ``contextId``.
        """
        return await self.call_json_api(
            self._relative_path,
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(draft),
        )

    async def remove(self, context_type: str, context_id: str) -> Any:
        """Delete a draft by context type and context ID."""
        return await self.call_api(
            self._get_draft_url(context_type, context_id), method="DELETE"
        )
