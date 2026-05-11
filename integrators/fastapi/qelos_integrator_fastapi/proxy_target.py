from __future__ import annotations

import os

from .config import QelosConfig


def resolve_qelos_proxy_target(config: QelosConfig) -> str | None:
    """Resolve the origin to which ``/api/**`` requests are proxied.

    Priority (highest first):

    1. ``QELOS_PROXY_TARGET`` env var
    2. ``QELOS_IP`` env var
    3. ``QELOS_API_IP`` env var
    4. ``config.app_url``

    Empty / whitespace-only values are skipped. Returns ``None`` when nothing
    is configured so callers can return 503 or treat the request as anonymous.
    """
    env = os.environ
    from_env = (
        (env.get("QELOS_PROXY_TARGET") or "").strip()
        or (env.get("QELOS_IP") or "").strip()
        or (env.get("QELOS_API_IP") or "").strip()
    )
    if from_env:
        return from_env

    from_app_url = (config.app_url or "").strip()
    return from_app_url or None
