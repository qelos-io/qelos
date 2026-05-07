from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Union

from .base_sdk import BaseSDK
from .types import QelosSDKOptions, RequestExtra


def _with_flat_default(query: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Default ``$flat=true`` when callers omit it.

    Blueprint entity responses default to the flat shape. Pass ``$flat=False``
    (or ``0``) to opt back into the wrapped shape; this also keeps SDK behavior
    consistent against older servers that defaulted to wrapped.
    """
    if query and "$flat" in query:
        return query
    merged: Dict[str, Any] = {**(query or {}), "$flat": True}
    return merged


BlueprintEntityFilters = Dict[str, Any]


class QlBlueprintEntitiesQuery:
    """Fluent query for blueprint entities (mirrors TS ``QlBlueprintEntitiesQuery``)."""

    def __init__(self, entities: "QlBlueprintEntities") -> None:
        self._entities = entities
        self._filters: BlueprintEntityFilters = {}
        self._options: Dict[str, Any] = {}

    def where(self, filters: BlueprintEntityFilters) -> "QlBlueprintEntitiesQuery":
        self._filters.update(filters)
        return self

    def limit(self, value: int) -> "QlBlueprintEntitiesQuery":
        self._options["$limit"] = value
        return self

    def skip(self, value: int) -> "QlBlueprintEntitiesQuery":
        self._options["$skip"] = value
        return self

    def sort(self, value: str) -> "QlBlueprintEntitiesQuery":
        self._options["$sort"] = value
        return self

    def select(self, fields: Union[str, List[str]]) -> "QlBlueprintEntitiesQuery":
        self._options["$select"] = ",".join(fields) if isinstance(fields, list) else fields
        return self

    def to_query(self) -> Dict[str, Any]:
        return {**self._filters, **self._options}

    async def find(self, extra: Optional[RequestExtra] = None) -> List[Dict[str, Any]]:
        return await self._entities.get_list(self.to_query(), extra)

    async def find_one(self, extra: Optional[RequestExtra] = None) -> Optional[Dict[str, Any]]:
        rows = await self._entities.get_list({**self.to_query(), "$limit": 1}, extra)
        return rows[0] if rows else None

    async def count(self, extra: Optional[RequestExtra] = None) -> int:
        return await self._entities.count(self.to_query(), extra)


class QlBlueprintEntities(BaseSDK):
    """CRUD operations on entities belonging to a specific blueprint."""

    _relative_path = "/api/blueprints"

    def __init__(self, options: QelosSDKOptions, blueprint_key: str) -> None:
        super().__init__(options)
        self._blueprint_key = blueprint_key

    def query(self) -> QlBlueprintEntitiesQuery:
        return QlBlueprintEntitiesQuery(self)

    def where(self, filters: BlueprintEntityFilters) -> QlBlueprintEntitiesQuery:
        return self.query().where(filters)

    def limit(self, value: int) -> QlBlueprintEntitiesQuery:
        return self.query().limit(value)

    def skip(self, value: int) -> QlBlueprintEntitiesQuery:
        return self.query().skip(value)

    def sort(self, value: str) -> QlBlueprintEntitiesQuery:
        return self.query().sort(value)

    def select(self, fields: Union[str, List[str]]) -> QlBlueprintEntitiesQuery:
        return self.query().select(fields)

    async def find(
        self,
        filters: Optional[Dict[str, Any]] = None,
        extra: Optional[RequestExtra] = None,
    ) -> List[Dict[str, Any]]:
        """List entities; pass filters as the first positional argument for shorthand queries."""
        return await self.get_list(filters, extra)

    async def find_one(self, identifier: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Load a single entity by identifier (same as :meth:`get_entity`)."""
        return await self.get_entity(identifier, extra)

    async def get_entity(self, identifier: str, extra: Optional[RequestExtra] = None) -> Dict[str, Any]:
        """Get a single entity by identifier."""
        qs = self.get_query_params(_with_flat_default(extra.query if extra else None))
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
        and any blueprint-specific property filters. Responses default to the flat shape;
        pass ``$flat=False`` to receive the wrapped shape.
        """
        qs = self.get_query_params(_with_flat_default(query))
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )

    async def remove(self, identifier: str, extra: Optional[RequestExtra] = None) -> Any:
        """Delete an entity by identifier."""
        qs = self.get_query_params(_with_flat_default(extra.query if extra else None))
        return await self.call_api(
            f"{self._relative_path}/{self._blueprint_key}/entities/{identifier}{qs}",
            method="DELETE",
        )

    async def delete(self, identifier: str, extra: Optional[RequestExtra] = None) -> Any:
        """Alias for :meth:`remove` (TS-style ``deleteOne`` naming)."""
        return await self.remove(identifier, extra)

    async def update(
        self,
        identifier: str,
        changes: Dict[str, Any],
        extra: Optional[RequestExtra] = None,
    ) -> Dict[str, Any]:
        """Update an entity by identifier."""
        qs = self.get_query_params(_with_flat_default(extra.query if extra else None))
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities/{identifier}{qs}",
            method="PUT",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(changes),
            timeout=extra.timeout if extra else None,
        )

    async def update_one(
        self,
        identifier: str,
        changes: Dict[str, Any],
        extra: Optional[RequestExtra] = None,
    ) -> Dict[str, Any]:
        """Alias for :meth:`update`."""
        return await self.update(identifier, changes, extra)

    async def create(
        self,
        entity: Dict[str, Any],
        extra: Optional[RequestExtra] = None,
    ) -> Dict[str, Any]:
        """Create a new entity."""
        qs = self.get_query_params(_with_flat_default(extra.query if extra else None))
        return await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/entities{qs}",
            method="POST",
            headers={"content-type": "application/json", **(extra.headers if extra and extra.headers else {})},
            body=json.dumps(entity),
            timeout=extra.timeout if extra else None,
        )

    async def count(
        self,
        query: Optional[Dict[str, Any]] = None,
        extra: Optional[RequestExtra] = None,
    ) -> int:
        """Count entities matching filters (chart count endpoint; no ``$flat`` default)."""
        qs = self.get_query_params(query)
        res = await self.call_json_api(
            f"{self._relative_path}/{self._blueprint_key}/charts/count{qs}",
            headers=extra.headers if extra else None,
            timeout=extra.timeout if extra else None,
        )
        if isinstance(res, dict):
            return int(res.get("count", 0))
        return 0

    async def delete_one(self, identifier: str, extra: Optional[RequestExtra] = None) -> Any:
        """Alias for :meth:`remove`."""
        return await self.remove(identifier, extra)
