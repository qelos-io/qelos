from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base_sdk import BaseSDK
from .blueprint_entities import QlBlueprintEntities
from .types import QelosSDKOptions


class QlBlueprints(BaseSDK):
    """Blueprint management and entity access, including chart and aggregation queries."""

    _relative_path = "/api/blueprints"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)
        self._options = options
        self._entities: Dict[str, QlBlueprintEntities] = {}

    async def get_blueprint(self, key: str) -> Dict[str, Any]:
        """Get a blueprint by key."""
        return await self.call_json_api(f"{self._relative_path}/{key}")

    async def get_list(self) -> List[Dict[str, Any]]:
        """List all blueprints."""
        return await self.call_json_api(self._relative_path)

    def entities_of(self, blueprint_key: str) -> QlBlueprintEntities:
        """Get a :class:`QlBlueprintEntities` manager for a specific blueprint.

        Instances are cached so subsequent calls with the same key return the same object.
        """
        if blueprint_key not in self._entities:
            self._entities[blueprint_key] = QlBlueprintEntities(self._options, blueprint_key)
        return self._entities[blueprint_key]

    async def get_chart(
        self, blueprint_key: str, chart_type: str, query: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get chart data for a blueprint."""
        qs = self.get_query_params(query)
        return await self.call_json_api(f"{self._relative_path}/{blueprint_key}/charts/{chart_type}{qs}")

    async def get_pie_chart(self, blueprint_key: str, query: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get pie chart data for a blueprint."""
        qs = self.get_query_params(query)
        return await self.call_json_api(f"{self._relative_path}/{blueprint_key}/charts/pie{qs}")

    async def get_count(self, blueprint_key: str, query: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get entity count for a blueprint."""
        qs = self.get_query_params(query)
        return await self.call_json_api(f"{self._relative_path}/{blueprint_key}/charts/count{qs}")

    async def get_sum(
        self,
        blueprint_key: str,
        sum_property: str,
        group_by_property: Optional[str] = None,
        query: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Get sum (with optional grouping) for a blueprint property."""
        params = {**(query or {}), "sum": sum_property}
        if group_by_property:
            params["groupBy"] = group_by_property
        qs = self.get_query_params(params)
        return await self.call_json_api(f"{self._relative_path}/{blueprint_key}/charts/sum{qs}")
