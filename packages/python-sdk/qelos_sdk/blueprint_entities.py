from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions, RequestExtra


class QlBlueprintEntities(BaseSDK):
    """CRUD operations on entities belonging to a specific blueprint."""

    _relative_path = "/api/blueprints"

    def __init__(self, options: QelosSDKOptions, blueprint_key: str) -> None:
        super().__init__(options)
        self._blueprint_key = blueprint_key

    async def get_entity(self, identifier: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get a single entity by identifier."""
        qs = self.get_query_params(extra.query if extra else None)
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities/{identifier}{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def get_list(
        self,
        query: Optional[Dict[str, Any]] = None,
        extra: Optional[RequestExtra] = None,
    ) -> List[Dict[str, Any]]:
        """List entities with optional query filters.

        Supported query filters: ``$populate``, ``$sort``, ``$limit``, ``$page``, ``$flat``,
        and any blueprint-specific property filters.
        """
        qs = self.get_query_params(query)
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def remove(self, identifier: str, extra: Optional[RequestExtra] = None) -> Any:
        """Delete an entity by identifier."""
        qs = self.get_query_params(extra.query if extra else None)
        return await self.call_api(
            f"{self._relative_path}/{self._blueprint_key}/entities/{identifier}{qs}",
            method="DELETE",
        )

    async def update(
        self,
        identifier: str,
        changes: Dict[str, Any],
        extra: Optional[RequestExtra] = None,
    ) -> Dict[str, Any]:
        """Update an entity by identifier."""
        qs = self.get_query_params(extra.query if extra else None)
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities/{identifier}{qs}",
            method="PUT",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(changes),
            timeout=extra.timeout if extra else None,
        )

    async def create(
        self,
        entity: Dict[str, Any],
        extra: Optional[RequestExtra] = None,
    ) -> Dict[str, Any]:
        """Create a new entity."""
        qs = self.get_query_params(extra.query if extra else None)
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities{qs}",
            method="POST",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(entity),
            timeout=extra.timeout if extra else None,
        )
