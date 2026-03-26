from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from ..base_sdk import BaseSDK
from ..types import QelosSDKOptions


class QlPaymentsAdmin(BaseSDK):
    """Admin payment management: plans, subscriptions, invoices, and coupons."""

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    # --- Plans ---

    async def get_plans(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List all plans."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"/api/plans{qs}")

    async def get_plan(self, plan_id: str) -> Dict[str, Any]:
        """Get a plan by ID."""
        return await self.call_json_api(f"/api/plans/{plan_id}")

    async def create_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new plan."""
        return await self.call_json_api(
            "/api/plans",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def update_plan(self, plan_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a plan."""
        return await self.call_json_api(
            f"/api/plans/{plan_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def delete_plan(self, plan_id: str) -> Dict[str, Any]:
        """Delete a plan."""
        return await self.call_json_api(f"/api/plans/{plan_id}", method="DELETE")

    # --- Subscriptions ---

    async def get_subscriptions(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List subscriptions with optional filters."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"/api/subscriptions{qs}")

    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Get a subscription by ID."""
        return await self.call_json_api(f"/api/subscriptions/{subscription_id}")

    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Cancel a subscription."""
        return await self.call_json_api(
            f"/api/subscriptions/{subscription_id}/cancel", method="PUT"
        )

    # --- Invoices ---

    async def get_invoices(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List invoices with optional filters."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"/api/invoices{qs}")

    async def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Get an invoice by ID."""
        return await self.call_json_api(f"/api/invoices/{invoice_id}")

    # --- Coupons ---

    async def get_coupons(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List coupons."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"/api/coupons{qs}")

    async def get_coupon(self, coupon_id: str) -> Dict[str, Any]:
        """Get a coupon by ID."""
        return await self.call_json_api(f"/api/coupons/{coupon_id}")

    async def create_coupon(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new coupon."""
        return await self.call_json_api(
            "/api/coupons",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def update_coupon(self, coupon_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a coupon."""
        return await self.call_json_api(
            f"/api/coupons/{coupon_id}",
            method="PUT",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def delete_coupon(self, coupon_id: str) -> Dict[str, Any]:
        """Delete a coupon."""
        return await self.call_json_api(f"/api/coupons/{coupon_id}", method="DELETE")
