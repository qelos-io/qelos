from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base_sdk import BaseSDK
from .types import QelosSDKOptions


class QlAuthentication(BaseSDK):
    """Authentication module for sign-in, sign-up, token management, and user operations."""

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)
        self._refresh_token: Optional[str] = None
        self._access_token: Optional[str] = None
        self._api_token: Optional[str] = None

        if options.access_token or options.get_access_token:
            self._access_token = options.access_token or (
                options.get_access_token() if options.get_access_token else None
            )
            options.access_token = None

        if options.refresh_token:
            self._refresh_token = options.refresh_token
            options.refresh_token = None

        if options.api_token:
            self._api_token = options.api_token

    @property
    def access_token(self) -> Optional[str]:
        """Get the current access token."""
        return self._access_token

    @property
    def is_api_token_auth(self) -> bool:
        """Check if using API token authentication."""
        return bool(self._api_token)

    async def signin(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Sign in with username and password.

        Args:
            credentials: Dict with ``username``, ``password``, and optional ``roles``.
        """
        response = await self.call_api(
            "/api/signin",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(credentials),
        )
        if not response.is_success:
            raise Exception("failed to login")
        body = response.json()
        return {
            **body,
            "headers": {"set-cookie": response.headers.get("set-cookie")},
        }

    async def oauth_signin(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """OAuth sign in. Sets access and refresh tokens automatically."""
        data = await self.call_json_api(
            "/api/signin",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps({**credentials, "authType": "oauth"}),
        )
        self._access_token = data["payload"]["token"]
        self._refresh_token = data["payload"]["refreshToken"]
        return data

    async def signup(self, information: Dict[str, Any]) -> Dict[str, Any]:
        """Sign up a new user.

        Args:
            information: Dict with ``username``, ``password``, ``firstName``,
                ``lastName``, ``birthDate``, and optional ``email``, ``phone``, ``fullName``.
        """
        return await self.call_json_api(
            "/api/signup",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(information),
        )

    async def oauth_signup(self, information: Dict[str, Any]) -> Dict[str, Any]:
        """OAuth sign up. Sets access and refresh tokens automatically."""
        data = await self.call_json_api(
            "/api/signup",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps({**information, "authType": "oauth"}),
        )
        self._access_token = data["payload"]["token"]
        self._refresh_token = data["payload"]["refreshToken"]
        return data

    async def refresh_token(self, refresh_token: Optional[str] = None) -> Dict[str, Any]:
        """Refresh the access token using a refresh token."""
        token = refresh_token or self._refresh_token
        if not token:
            raise Exception("existing refresh token not found")
        data = await self.call_json_api(
            "/api/token/refresh",
            method="POST",
            headers={"authorization": "Bearer " + token},
        )
        self._access_token = data["payload"]["token"]
        self._refresh_token = data["payload"]["refreshToken"]
        return data

    async def api_token_signin(self, api_token: str) -> Dict[str, Any]:
        """Sign in with an API token. Returns the current user."""
        self._api_token = api_token
        self._ql_options.api_token = api_token
        return await self.call_json_api("/api/me")

    async def list_api_tokens(self) -> List[Dict[str, Any]]:
        """List all API tokens for the current user."""
        return await self.call_json_api("/api/me/api-tokens")

    async def create_api_token(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new API token.

        Args:
            data: Dict with ``nickname``, ``expiresAt``, and optional ``workspace``.

        Returns:
            Dict with ``token`` and ``apiToken``.
        """
        return await self.call_json_api(
            "/api/me/api-tokens",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(data),
        )

    async def delete_api_token(self, token_id: str) -> None:
        """Delete an API token by ID."""
        await self.call_json_api(f"/api/me/api-tokens/{token_id}", method="DELETE")

    async def logout(self) -> Any:
        """Log out the current user."""
        return await self.call_api("/api/logout", method="POST")

    async def get_logged_in_user(self) -> Dict[str, Any]:
        """Get the currently logged-in user."""
        return await self.call_json_api("/api/me")

    async def update_logged_in_user(self, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update the currently logged-in user.

        Args:
            changes: Partial user fields to update, may include ``password``.
        """
        return await self.call_json_api(
            "/api/me",
            method="POST",
            headers={"content-type": "application/json"},
            body=json.dumps(changes),
        )
