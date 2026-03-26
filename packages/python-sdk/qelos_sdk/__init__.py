"""Qelos Python SDK – Build SaaS applications with ease.

Example::

    import asyncio
    from qelos_sdk import QelosSDK, QelosSDKOptions

    async def main():
        sdk = QelosSDK(QelosSDKOptions(
            app_url="https://yourdomain.com",
            api_token="your-api-token",
        ))
        user = await sdk.authentication.get_logged_in_user()
        print(user)
        await sdk.close()

    asyncio.run(main())
"""

from __future__ import annotations

from .ai import QlAI
from .authentication import QlAuthentication
from .base_sdk import BaseSDK, QelosAPIError
from .blocks import QlBlocks
from .blueprint_entities import QlBlueprintEntities
from .blueprints import QlBlueprints
from .configurations import QlAppConfigurations
from .invites import QlInvites
from .lambdas import QlLambdas
from .payments import QlPayments
from .types import QelosSDKOptions, RequestExtra
from .workspaces import QlWorkspaces

_NO_EXTRA_HEADERS_URLS = frozenset(["/api/token/refresh", "/api/signin", "/api/signup"])


class QelosSDK(BaseSDK):
    """Main Qelos SDK providing access to all API modules.

    Example::

        sdk = QelosSDK(QelosSDKOptions(
            app_url="https://yourdomain.com",
            api_token="your-api-token",
        ))

        # Authentication
        await sdk.authentication.oauth_signin({"username": "user@example.com", "password": "pass"})

        # Workspaces
        workspaces = await sdk.workspaces.get_list()

        # Blueprint entities
        entities = await sdk.blueprints.entities_of("my-blueprint").get_list()

        # AI chat
        response = await sdk.ai.chat.chat("integration-id", {"messages": [...]})
    """

    def __init__(self, options: QelosSDKOptions) -> None:
        super().__init__(options)
        self._custom_headers: dict[str, str] = {}

        self.blocks = QlBlocks(options)
        self.app_configurations = QlAppConfigurations(options)
        self.authentication = QlAuthentication(options)
        self.workspaces = QlWorkspaces(options)
        self.invites = QlInvites(options)
        self.blueprints = QlBlueprints(options)
        self.ai = QlAI(options)
        self.lambdas = QlLambdas(options)
        self.payments = QlPayments(options)

        # Set up default access token getter
        if not options.get_access_token:
            options.get_access_token = lambda: self.authentication.access_token

        # Set up default extra headers (auth headers)
        if not options.extra_headers:

            async def _default_extra_headers(relative_url: str, force_refresh: bool = False) -> dict[str, str]:
                if options.api_token:
                    return {"x-api-key": options.api_token, **self._custom_headers}
                if relative_url in _NO_EXTRA_HEADERS_URLS:
                    return {**self._custom_headers}
                token = "" if force_refresh else (options.get_access_token() if options.get_access_token else None)
                if not token:
                    await self.authentication.refresh_token()
                    token = options.get_access_token() if options.get_access_token else None
                if token:
                    return {"authorization": "Bearer " + token, **self._custom_headers}
                return {**self._custom_headers}

            options.extra_headers = _default_extra_headers

    def set_custom_header(self, key: str, value: str) -> None:
        """Add a custom header to all subsequent requests."""
        self._custom_headers[key] = value

    def remove_custom_header(self, key: str) -> None:
        """Remove a custom header."""
        self._custom_headers.pop(key, None)


__all__ = [
    "QelosSDK",
    "QelosSDKOptions",
    "RequestExtra",
    "QelosAPIError",
    "BaseSDK",
    "QlAuthentication",
    "QlWorkspaces",
    "QlAppConfigurations",
    "QlBlocks",
    "QlBlueprints",
    "QlBlueprintEntities",
    "QlInvites",
    "QlLambdas",
    "QlPayments",
    "QlAI",
]
