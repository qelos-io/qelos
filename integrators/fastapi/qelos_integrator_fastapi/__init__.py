"""FastAPI integrator for Qelos.

Adds a request middleware that calls the Qelos SDK to identify the current
user and their active workspace before your handlers run, exposing them on
``request.state.qelos``.

Example::

    from fastapi import Depends, FastAPI
    from qelos_integrator_fastapi import (
        qelos_middleware,
        get_qelos_user,
        QelosUser,
    )

    app = FastAPI()
    app.add_middleware(qelos_middleware, app_url="https://my.qelos.io", api_token="...")

    @app.get("/me")
    async def me(user: QelosUser = Depends(get_qelos_user)):
        return {"name": user.full_name}
"""

from __future__ import annotations

from .config import QelosConfig
from .context import (
    QelosRequestContext,
    ResolvedTokens,
    TokenPair,
    TokenRefreshContext,
    TokenRefreshHook,
)
from .dependencies import get_qelos, get_qelos_sdk, get_qelos_user, require_user
from .middleware import (
    QelosIntegratorMiddleware,
    QelosMiddleware,
    WorkspaceResolver,
    qelos_middleware,
)
from .models import QelosUser, QelosWorkspace
from .sdk_factory import create_request_sdk

__all__ = [
    "QelosConfig",
    "QelosIntegratorMiddleware",
    "QelosMiddleware",
    "QelosRequestContext",
    "QelosUser",
    "QelosWorkspace",
    "ResolvedTokens",
    "TokenPair",
    "TokenRefreshContext",
    "TokenRefreshHook",
    "WorkspaceResolver",
    "create_request_sdk",
    "get_qelos",
    "get_qelos_sdk",
    "get_qelos_user",
    "qelos_middleware",
    "require_user",
]
