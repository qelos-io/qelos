from __future__ import annotations

import os

from .config import QelosConfig
from .mock import get_mock_origin


def resolve_qelos_proxy_target(config: QelosConfig) -> str | None:
    """Resolve the origin to which ``/api/**`` requests are proxied.

    In dev mock mode (``config.mock`` / ``QELOS_MOCK`` / ``QELOS_MOCK_URL``) the
    mock Qelos origin always wins, after the production guard.

    Otherwise priority (highest first):

    1. ``QELOS_PROXY_TARGET`` env var
    2. ``QELOS_IP`` env var
    3. ``QELOS_API_IP`` env var
    4. ``config.app_url``

    Empty / whitespace-only values are skipped. Returns ``None`` when nothing
    is configured so callers can return 503 or treat the request as anonymous.
    """
    mock_origin = get_mock_origin(config)
    if mock_origin:
        return mock_origin

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
