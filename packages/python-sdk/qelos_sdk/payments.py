from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlPayments(BaseSDK):
    """User-facing payment operations: plans, checkout, subscriptions, invoices, and coupons."""

    _relative_path = "/api"

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)

    async def get_plans(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get public plans."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"{self._relative_path}/plans/public{qs}")

    async def get_plan(self, plan_id: str) -> Dict[str, Any]:
        """Get a plan by ID."""
        return await self.call_json_api(f"{self._relative_path}/plans/{plan_id}")

    async def checkout(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a checkout session.

        Args:
            params: Dict with ``planId``, ``billingCycle``, and optional
                ``couponCode``, ``successUrl``, ``cancelUrl``.

        Returns:
            Dict with ``subscriptionId`` and optional ``checkoutUrl``, ``clientToken``.
        """
        return await self.call_json_api(
            f"{self._relative_path}/checkout",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(params),
        )

    async def get_my_subscription(self) -> Dict[str, Any]:
        """Get the current user's subscription."""
        return await self.call_json_api(f"{self._relative_path}/subscriptions/me")

    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Cancel a subscription."""
        return await self.call_json_api(
            f"{self._relative_path}/subscriptions/{subscription_id}/cancel",
            method="PUT",
        )

    async def get_invoices(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List invoices."""
        qs = "?" + urlencode(query) if query else ""
        return await self.call_json_api(f"{self._relative_path}/invoices{qs}")

    async def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Get an invoice by ID."""
        return await self.call_json_api(f"{self._relative_path}/invoices/{invoice_id}")

    async def validate_coupon(self, code: str, plan_id: Optional[str] = None) -> Dict[str, Any]:
        """Validate a coupon code."""
        return await self.call_json_api(
            f"{self._relative_path}/coupons/validate",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps({"code": code, "planId": plan_id}),
        )
