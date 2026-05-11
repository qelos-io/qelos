from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class QelosConfig:
    """Configuration for :class:`QelosIntegratorMiddleware`."""

    #: Base URL of the Qelos backend (e.g. ``https://yourdomain.com``).
    app_url: str

    #: Static API token for service-to-service calls. When provided, no
    #: cookie-based authentication is performed.
    api_token: Optional[str] = None

    #: When True, the middleware short-circuits with 401 if the user cannot
    #: be resolved. Defaults to False — anonymous requests pass through with
    #: ``request.state.qelos.user = None``.
    require_auth: bool = False

    #: Skip the middleware entirely for requests whose path starts with any
    #: of these prefixes. Useful for ``/health``, ``/api/_auth``, etc.
    skip_paths: List[str] = field(default_factory=list)

    #: When False (default), ``/api/`` is prepended to ``skip_paths`` so inbound
    #: ``/api/**`` traffic is not double-handled when using the catch-all proxy
    #: router from :func:`create_qelos_proxy_router`.
    disable_proxy: bool = False

    #: Extra options merged into the per-request SDK instance. Mirrors
    #: :class:`qelos_sdk.QelosSDKOptions` but as a plain dict — only keys
    #: explicitly set here override the middleware's own configuration.
    sdk_options: Dict[str, Any] = field(default_factory=dict)
