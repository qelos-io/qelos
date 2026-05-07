from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union

from qelos_sdk import QelosAPIError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .config import QelosConfig
from .context import (
    QelosRequestContext,
    ResolvedTokens,
    TokenPair,
    TokenRefreshContext,
    TokenRefreshHook,
)
from .sdk_factory import create_request_sdk


WorkspaceResolver = Callable[
    [Request, Dict[str, Any], List[Dict[str, Any]]],
    Union[
        Optional[Dict[str, Any]],
        Awaitable[Optional[Dict[str, Any]]],
    ],
]


class CookieBuffer:
    """Collects ``Set-Cookie`` until a real :class:`Response` exists."""

    __slots__ = ("_ops",)

    def __init__(self) -> None:
        self._ops: list[tuple[str, str, dict[str, Any]]] = []

    def set_cookie(self, name: str, value: str, **kwargs: Any) -> None:
        self._ops.append((name, value, kwargs))

    def apply(self, response: Response) -> None:
        for name, value, kw in self._ops:
            response.set_cookie(name, value, **kw)


def _read_cookie_header(header_val: Optional[str], name: str) -> Optional[str]:
    if not header_val:
        return None
    prefix = name + "="
    for part in header_val.split(";"):
        trimmed = part.strip()
        if trimmed.startswith(prefix):
            try:
                from urllib.parse import unquote

                return unquote(trimmed[len(prefix) :])
            except Exception:
                return trimmed[len(prefix) :]
    return None


def read_tokens(request: Request, config: QelosConfig) -> TokenPair:
    cookie_access = request.cookies.get(config.access_token_cookie) or _read_cookie_header(
        request.headers.get("cookie"),
        config.access_token_cookie,
    )
    cookie_refresh = request.cookies.get(config.refresh_token_cookie) or _read_cookie_header(
        request.headers.get("cookie"),
        config.refresh_token_cookie,
    )
    raw_auth = request.headers.get("authorization")
    auth_header = raw_auth[0] if isinstance(raw_auth, list) else raw_auth
    header_access: Optional[str] = None
    if auth_header and auth_header.lower().startswith("bearer "):
        header_access = auth_header[7:].strip()
    return TokenPair(
        access_token=header_access or cookie_access or None,
        refresh_token=cookie_refresh or None,
    )


def write_tokens_to_response_like(
    target: Any,
    config: QelosConfig,
    tokens: ResolvedTokens,
) -> None:
    secure = not config.app_url.lower().startswith("http://")
    opts: dict[str, Any] = {
        "httponly": True,
        "secure": secure,
        "samesite": "lax",
        "path": "/",
    }
    target.set_cookie(config.access_token_cookie, tokens.access_token, **opts)
    if tokens.refresh_token:
        target.set_cookie(config.refresh_token_cookie, tokens.refresh_token, **opts)


def should_skip(request: Request, config: QelosConfig) -> bool:
    if not config.skip_paths:
        return False
    path = request.url.path or ""
    return any(path.startswith(prefix) for prefix in config.skip_paths)


async def _maybe_resolve_workspace(
    resolve_workspace: Optional[WorkspaceResolver],
    request: Request,
    user: Dict[str, Any],
    workspaces: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not resolve_workspace:
        return workspaces[0] if workspaces else None
    result = resolve_workspace(request, user, workspaces)
    if inspect.isawaitable(result):
        return await result  # type: ignore[no-any-return]
    return result  # type: ignore[no-any-return]


class QelosIntegratorMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that attaches Qelos context on ``request.state.qelos``."""

    def __init__(
        self,
        app,
        *,
        config: QelosConfig,
        on_token_refresh: Optional[TokenRefreshHook] = None,
        resolve_workspace: Optional[WorkspaceResolver] = None,
    ) -> None:
        super().__init__(app)
        self._config = config
        self._on_token_refresh = on_token_refresh
        self._resolve_workspace = resolve_workspace

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if should_skip(request, self._config):
            return await call_next(request)

        cookie_buffer = CookieBuffer()

        async def default_on_refresh(ctx: TokenRefreshContext) -> None:
            write_tokens_to_response_like(cookie_buffer, ctx.config, ctx.new_tokens)

        hook: TokenRefreshHook = self._on_token_refresh or default_on_refresh

        tokens = read_tokens(request, self._config)
        sdk = create_request_sdk(
            self._config,
            tokens,
            request,
            cookie_buffer,
            hook,
        )
        ctx = QelosRequestContext(sdk=sdk, tokens=tokens)
        request.state.qelos = ctx

        try:
            has_auth = bool(
                self._config.api_token or tokens.access_token or tokens.refresh_token,
            )
            if not has_auth:
                if self._config.require_auth:
                    return JSONResponse({"code": "UNAUTHORIZED"}, status_code=401)
                response = await call_next(request)
                cookie_buffer.apply(response)
                return response

            try:
                ctx.user = await sdk.authentication.get_logged_in_user()
            except QelosAPIError:
                if self._config.require_auth:
                    return JSONResponse({"code": "UNAUTHORIZED"}, status_code=401)
                response = await call_next(request)
                cookie_buffer.apply(response)
                return response

            try:
                ctx.workspaces = await sdk.workspaces.get_list()
            except QelosAPIError:
                ctx.workspaces = []

            if ctx.user and ctx.workspaces:
                ctx.workspace = await _maybe_resolve_workspace(
                    self._resolve_workspace,
                    request,
                    ctx.user,
                    ctx.workspaces,
                )

            response = await call_next(request)
            cookie_buffer.apply(response)
            return response
        finally:
            await sdk.close()


class QelosMiddleware(QelosIntegratorMiddleware):
    """Same as :class:`QelosIntegratorMiddleware`, but accepts flat kwargs for
    :func:`starlette.applications.Starlette.add_middleware`::

        app.add_middleware(qelos_middleware, app_url="https://my.qelos.io", api_token="...")

    Alternatively pass a ready-made :class:`~qelos_integrator_fastapi.config.QelosConfig`
    as ``config=`` (do not mix with ``app_url`` / ``api_token``).
    """

    def __init__(
        self,
        app,
        *,
        config: Optional[QelosConfig] = None,
        app_url: Optional[str] = None,
        api_token: Optional[str] = None,
        access_token_cookie: str = "q_access_token",
        refresh_token_cookie: str = "q_refresh_token",
        require_auth: bool = False,
        skip_paths: Optional[List[str]] = None,
        sdk_options: Optional[Dict[str, Any]] = None,
        on_token_refresh: Optional[TokenRefreshHook] = None,
        resolve_workspace: Optional[WorkspaceResolver] = None,
    ) -> None:
        if config is not None:
            if app_url is not None or api_token is not None:
                raise TypeError(
                    "Pass either config=... or flat kwargs (app_url, api_token, ...), not both.",
                )
            resolved = config
        else:
            if app_url is None:
                raise TypeError(
                    "QelosMiddleware requires app_url=... or config=QelosConfig(...).",
                )
            resolved = QelosConfig(
                app_url=app_url,
                api_token=api_token,
                access_token_cookie=access_token_cookie,
                refresh_token_cookie=refresh_token_cookie,
                require_auth=require_auth,
                skip_paths=list(skip_paths or []),
                sdk_options=dict(sdk_options or {}),
            )
        super().__init__(
            app,
            config=resolved,
            on_token_refresh=on_token_refresh,
            resolve_workspace=resolve_workspace,
        )


qelos_middleware = QelosMiddleware
