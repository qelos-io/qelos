from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, Request

from .context import QelosRequestContext


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
