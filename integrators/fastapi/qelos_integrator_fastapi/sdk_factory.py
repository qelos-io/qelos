from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

from qelos_sdk import QelosSDK, QelosSDKOptions

from .config import QelosConfig

if TYPE_CHECKING:
    from starlette.requests import Request


def _coerce_options(extra: Dict[str, Any]) -> Dict[str, Any]:
    """Translate camelCase JS-style overrides to the snake_case Python SDK
    expects, so callers can copy ``sdkOptions`` from the Node integrators.
    """
    if not extra:
        return {}
    mapping = {
        "appUrl": "app_url",
        "apiToken": "api_token",
        "getAccessToken": "get_access_token",
        "extraHeaders": "extra_headers",
        "extraQueryParams": "extra_query_params",
    }
    return {mapping.get(k, k): v for k, v in extra.items()}


def create_request_sdk(config: QelosConfig, request: "Request") -> QelosSDK:
    """Build a per-request :class:`QelosSDK` that forwards cookies live.

    When ``api_token`` is set, the SDK authenticates with that token. Otherwise
    an ``extra_headers`` callback reads ``Cookie`` and ``Authorization`` from
    the current Starlette :class:`Request` on every outbound SDK call.
    """

    overrides = _coerce_options(config.sdk_options or {})
    options_kwargs: Dict[str, Any] = {
        "app_url": config.app_url,
        "force_refresh": False,
        **overrides,
    }

    if config.api_token:
        options_kwargs["api_token"] = config.api_token
        return QelosSDK(QelosSDKOptions(**options_kwargs))

    async def _extra_headers(_relative_url: str, _force_refresh: bool = False) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        cookie = request.headers.get("cookie")
        if cookie:
            headers["cookie"] = cookie
        auth = request.headers.get("authorization")
        if auth:
            headers["authorization"] = auth
        return headers

    options_kwargs["extra_headers"] = _extra_headers
    return QelosSDK(QelosSDKOptions(**options_kwargs))
