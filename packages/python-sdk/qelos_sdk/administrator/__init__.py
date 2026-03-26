from __future__ import annotations

from ..types import QelosSDKOptions
from .admin_lambdas import QlManageLambdas
from .components import QlComponents
from .drafts import QlDrafts
from .events import QlEvents
from .integration_sources import QlIntegrationSources
from .integrations import QlIntegrations
from .manage_blueprints import QlManageBlueprints
from .manage_configurations import QlManageConfigurations
from .manage_plugins import QlManagePlugins
from .payments import QlPaymentsAdmin
from .roles import QlRoles
from .users import QlUsers
from .workspaces import QlAdminWorkspaces

# Avoid circular import – the main SDK module is imported lazily.
_QelosSDK = None


def _get_sdk_class():
    global _QelosSDK
    if _QelosSDK is None:
        from .. import QelosSDK as _cls
        _QelosSDK = _cls
    return _QelosSDK


class QelosAdministratorSDK:
    """Administrator SDK extending the main :class:`QelosSDK` with admin-only modules.

    Provides user management, blueprint management, event management,
    integration management, plugin management, and more.

    Example::

        admin_sdk = QelosAdministratorSDK(QelosSDKOptions(
            app_url="https://yourdomain.com",
            api_token="admin-api-token",
        ))
        users = await admin_sdk.users.get_list()
    """

    def __init__(self, options: QelosSDKOptions) -> None:
        # Build main SDK
        sdk_cls = _get_sdk_class()
        self._sdk = sdk_cls(options)

        # Expose main SDK sub-modules
        self.blocks = self._sdk.blocks
        self.app_configurations = self._sdk.app_configurations
        self.authentication = self._sdk.authentication
        self.workspaces = self._sdk.workspaces
        self.invites = self._sdk.invites
        self.blueprints = self._sdk.blueprints
        self.ai = self._sdk.ai
        self.lambdas = self._sdk.lambdas
        self.payments = self._sdk.payments

        # Admin-only modules
        self.manage_lambdas = QlManageLambdas(options)
        self.users = QlUsers(options)
        self.manage_configurations = QlManageConfigurations(options)
        self.manage_blueprints = QlManageBlueprints(options)
        self.drafts = QlDrafts(options)
        self.events = QlEvents(options)
        self.admin_workspaces = QlAdminWorkspaces(options)
        self.roles = QlRoles(options)
        self.integration_sources = QlIntegrationSources(options)
        self.manage_plugins = QlManagePlugins(options)
        self.components = QlComponents(options)
        self.integrations = QlIntegrations(options)
        self.manage_payments = QlPaymentsAdmin(options)

        # Default extra query params for admin bypass
        if not options.extra_query_params:
            options.extra_query_params = lambda: {"bypassAdmin": "true"}

    def impersonate_user(self, user_id: str, workspace_id: str | None = None) -> None:
        """Set impersonation headers to act as another user."""
        self._sdk.set_custom_header("x-impersonate-user", user_id)
        if workspace_id:
            self._sdk.set_custom_header("x-impersonate-workspace", workspace_id)

    def clear_impersonation(self) -> None:
        """Remove impersonation headers."""
        self._sdk.remove_custom_header("x-impersonate-user")
        self._sdk.remove_custom_header("x-impersonate-workspace")

    def set_custom_header(self, key: str, value: str) -> None:
        """Add a custom header to all requests."""
        self._sdk.set_custom_header(key, value)

    def remove_custom_header(self, key: str) -> None:
        """Remove a custom header."""
        self._sdk.remove_custom_header(key)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._sdk.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()


__all__ = [
    "QelosAdministratorSDK",
    "QlManageLambdas",
    "QlUsers",
    "QlManageConfigurations",
    "QlManageBlueprints",
    "QlDrafts",
    "QlEvents",
    "QlAdminWorkspaces",
    "QlRoles",
    "QlIntegrationSources",
    "QlIntegrations",
    "QlManagePlugins",
    "QlComponents",
    "QlPaymentsAdmin",
]
