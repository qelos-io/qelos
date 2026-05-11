"""FastAPI integrator for Qelos.

Adds Starlette middleware that resolves the current user via the managed Qelos
app (``GET /api/me`` with same-origin cookie pass-through) and exposes context
on ``request.state.qelos``. Optionally mount :func:`create_qelos_proxy_router` to
proxy ``/api/**`` to Qelos.

Example::

    from fastapi import Depends, FastAPI
    from qelos_integrator_fastapi import (
        qelos_middleware,
        get_qelos_user,
        QelosUser,
    )

    app = FastAPI()
    app.add_middleware(qelos_middleware, app_url="https://my.qelos.io")

    @app.get("/me")
    async def me(user: QelosUser = Depends(get_qelos_user)):
        return {"name": user.full_name}
"""

from __future__ import annotations

from .config import QelosConfig
from .context import QelosRequestContext
from .cookies import rewrite_set_cookie_domain, rewrite_set_cookie_domains
from .dependencies import get_qelos, get_qelos_sdk, get_qelos_user, require_user
from .middleware import (
    QelosIntegratorMiddleware,
    QelosMiddleware,
    WorkspaceResolver,
    qelos_middleware,
)
from .models import QelosUser, QelosWorkspace
from .proxy import create_qelos_proxy_router
from .proxy_target import resolve_qelos_proxy_target
from .sdk_factory import create_request_sdk

__all__ = [
    "QelosConfig",
    "QelosIntegratorMiddleware",
    "QelosMiddleware",
    "QelosRequestContext",
    "QelosUser",
    "QelosWorkspace",
    "WorkspaceResolver",
    "create_qelos_proxy_router",
    "create_request_sdk",
    "get_qelos",
    "get_qelos_sdk",
    "get_qelos_user",
    "qelos_middleware",
    "require_user",
    "resolve_qelos_proxy_target",
    "rewrite_set_cookie_domain",
    "rewrite_set_cookie_domains",
]
