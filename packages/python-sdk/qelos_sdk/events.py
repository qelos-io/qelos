from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlEvents(BaseSDK):
    """Platform events: list, inspect, and emit (mirrors admin ``QlEvents`` + paginated gateway API)."""

    _relative_path = "/api/events"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def list(
        self,
        *,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        kind: Optional[str] = None,
        event_name: Optional[str] = None,
        source: Optional[str] = None,
        user: Optional[str] = None,
        workspace: Optional[str] = None,
        period: Optional[str] = None,
        from_: Optional[str] = None,
        to: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List events. The HTTP API returns a paginated wrapper; this returns the ``events`` array."""
        params: Dict[str, Any] = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if kind is not None:
            params["kind"] = kind
        if event_name is not None:
            params["eventName"] = event_name
        if source is not None:
            params["source"] = source
        if user is not None:
            params["user"] = user
        if workspace is not None:
            params["workspace"] = workspace
        if period is not None:
            params["period"] = period
        if from_ is not None:
            params["from"] = from_
        if to is not None:
            params["to"] = to

        qs = self.get_query_params(params)
        body = await self.call_json_api(f"{self._relative_path}{qs}")

        if isinstance(body, dict) and "events" in body:
            return body["events"]
        if isinstance(body, list):
            return body
        return []

    async def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get a single event by ID."""
        return await self.call_json_api(f"{self._relative_path}/{event_id}")

    async def dispatch(self, payload: Dict[str, Any]) -> None:
        """Emit a platform event."""
        await self.call_api(
            self._relative_path,
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(payload),
        )
