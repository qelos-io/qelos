from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlEvents(BaseSDK):
    """Admin event management: list, get, and dispatch events."""

    _relative_path = "/api/events"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_list(self, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List events with optional filters.

        Supported filters: ``page``, ``kind``, ``eventName``, ``source``,
        ``user``, ``workspace``, ``period``.
        """
        qs = ""
        if params:
            filtered = {k: str(v) for k, v in params.items() if v is not None}
            if filtered:
                qs = "?" + urlencode(filtered)
        return await self.call_json_api(f"{self._relative_path}{qs}")

    async def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get an event by ID."""
        return await self.call_json_api(f"{self._relative_path}/{event_id}")

    async def dispatch(self, payload: Dict[str, Any]) -> None:
        """Dispatch a new event."""
        await self.call_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(payload),
        )
