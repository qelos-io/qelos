from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, Request
from qelos_sdk import QelosSDK

from .context import QelosRequestContext
from .models import QelosUser


def get_qelos(request: Request) -> Optional[QelosRequestContext]:
    """Return the Qelos context for this request, or ``None`` if the middleware
    did not run (e.g. ``skip_paths`` matched).
    """
    return getattr(request.state, "qelos", None)


def require_user(request: Request) -> QelosRequestContext:
    """FastAPI dependency that requires an authenticated Qelos user."""
    ctx = getattr(request.state, "qelos", None)
    if ctx is None or ctx.user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    return ctx


def get_qelos_sdk(request: Request) -> QelosSDK:
    """Return the per-request :class:`qelos_sdk.QelosSDK` built by the middleware."""
    ctx = getattr(request.state, "qelos", None)
    if ctx is None:
        raise HTTPException(status_code=500, detail={"code": "QELOS_MIDDLEWARE_MISSING"})
    return ctx.sdk


def get_qelos_user(request: Request) -> QelosUser:
    """FastAPI dependency: authenticated user as a :class:`QelosUser` model."""
    ctx = getattr(request.state, "qelos", None)
    if ctx is None or ctx.user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    return QelosUser.model_validate(ctx.user)
