from __future__ import annotations

from typing import Any, Dict, Optional, TYPE_CHECKING

from qelos_sdk import QelosSDK, QelosSDKOptions

from .config import QelosConfig
from .context import ResolvedTokens, TokenPair, TokenRefreshContext, TokenRefreshHook

if TYPE_CHECKING:
    from starlette.requests import Request


_NO_AUTH_URLS = frozenset(
    [
        "/api/token/refresh",
        "/api/cookie/refresh",
        "/api/signin",
        "/api/signup",
    ]
)


def _coerce_options(extra: Dict[str, Any]) -> Dict[str, Any]:
    """Translate camelCase JS-style overrides to the snake_case Python SDK
    expects, so callers can copy ``sdkOptions`` from the Node integrators.
    """
    if not extra:
        return {}
    mapping = {
        "appUrl": "app_url",
        "accessToken": "access_token",
        "refreshToken": "refresh_token",
        "apiToken": "api_token",
        "getAccessToken": "get_access_token",
        "extraHeaders": "extra_headers",
        "forceRefresh": "force_refresh",
        "onFailedRefreshToken": "on_failed_refresh_token",
        "extraQueryParams": "extra_query_params",
    }
    return {mapping.get(k, k): v for k, v in extra.items()}


def create_request_sdk(
    config: QelosConfig,
    tokens: TokenPair,
    request: "Request",
    response: Any,
    on_token_refresh: Optional[TokenRefreshHook] = None,
) -> QelosSDK:
    """Build a per-request :class:`QelosSDK` bound to ``tokens``.

    The SDK transparently refreshes tokens when the access token is rejected.
    When that happens, ``tokens`` is mutated in place and the optional
    ``on_token_refresh`` hook is invoked.
    """

    sdk_holder: Dict[str, Optional[QelosSDK]] = {"sdk": None}
    refresh_in_flight: Dict[str, Optional[Any]] = {"task": None}

    async def _do_refresh() -> None:
        sdk = sdk_holder["sdk"]
        if sdk is None:
            raise RuntimeError("sdk not yet constructed")
        if not tokens.refresh_token and not tokens.access_token:
            raise RuntimeError("no refresh token available")
        previous = TokenPair(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
        )
        if tokens.refresh_token:
            data = await sdk.authentication.refresh_token(tokens.refresh_token)
            payload = data.get("payload", {}) if isinstance(data, dict) else {}
            access = payload.get("token")
            if not access:
                raise RuntimeError("token refresh response missing access token")
            refreshed = ResolvedTokens(
                access_token=access,
                refresh_token=payload.get("refreshToken"),
            )
        else:
            data = await sdk.authentication.call_json_api(
                "/api/cookie/refresh",
                method="POST",
                headers={"authorization": "Bearer " + (tokens.access_token or "")},
            )
            payload = data.get("payload", {}) if isinstance(data, dict) else {}
            access = payload.get("cookieToken")
            if not access:
                raise RuntimeError("cookie refresh response missing cookie token")
            refreshed = ResolvedTokens(access_token=access)
        tokens.access_token = refreshed.access_token
        tokens.refresh_token = refreshed.refresh_token
        if on_token_refresh and sdk is not None:
            await on_token_refresh(
                TokenRefreshContext(
                    request=request,
                    response=response,
                    config=config,
                    old_tokens=previous,
                    new_tokens=refreshed,
                    sdk=sdk,
                )
            )

    async def _ensure_refresh() -> None:
        if refresh_in_flight["task"] is None:

            async def _run() -> None:
                try:
                    await _do_refresh()
                finally:
                    refresh_in_flight["task"] = None

            refresh_in_flight["task"] = _run()
        await refresh_in_flight["task"]

    overrides = _coerce_options(config.sdk_options or {})
    options_kwargs: Dict[str, Any] = {
        "app_url": config.app_url,
        "force_refresh": not config.api_token,
        **overrides,
    }

    if config.api_token:
        options_kwargs["api_token"] = config.api_token
    else:
        if tokens.access_token:
            options_kwargs["access_token"] = tokens.access_token
        if tokens.refresh_token:
            options_kwargs["refresh_token"] = tokens.refresh_token

        async def _extra_headers(relative_url: str, force_refresh: bool = False) -> Dict[str, str]:
            if relative_url in _NO_AUTH_URLS:
                return {}
            if force_refresh and tokens.refresh_token:
                await _ensure_refresh()
            sdk = sdk_holder["sdk"]
            token = (
                (sdk.authentication.access_token if sdk else None)
                or tokens.access_token
            )
            if token:
                return {"authorization": "Bearer " + token}
            return {}

        async def _on_failed_refresh() -> None:
            await _ensure_refresh()

        options_kwargs["extra_headers"] = _extra_headers
        options_kwargs["on_failed_refresh_token"] = _on_failed_refresh

    sdk = QelosSDK(QelosSDKOptions(**options_kwargs))
    sdk_holder["sdk"] = sdk
    return sdk
