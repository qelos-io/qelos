"""FastAPI integrator for Qelos.

Adds a request middleware that calls the Qelos SDK to identify the current
user and their active workspace before your handlers run, exposing them on
``request.state.qelos``.

Example::

    from fastapi import FastAPI, Depends
    from qelos_integrator_fastapi import (
        QelosIntegratorMiddleware,
        QelosConfig,
        get_qelos,
        require_user,
    )

    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="https://yourdomain.com"),
    )

    @app.get("/me")
    async def me(qelos = Depends(get_qelos)):
        return {"user": qelos.user, "workspace": qelos.workspace}

    @app.get("/private")
    async def private(qelos = Depends(require_user)):
        return qelos.user
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
from .dependencies import get_qelos, require_user
from .middleware import QelosIntegratorMiddleware, WorkspaceResolver
from .sdk_factory import create_request_sdk

__all__ = [
    "QelosConfig",
    "QelosIntegratorMiddleware",
    "QelosRequestContext",
    "ResolvedTokens",
    "TokenPair",
    "TokenRefreshContext",
    "TokenRefreshHook",
    "WorkspaceResolver",
    "create_request_sdk",
    "get_qelos",
    "require_user",
]
