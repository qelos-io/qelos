from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union

import httpx
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .config import QelosConfig
from .context import QelosRequestContext
from .cookies import rewrite_set_cookie_domain
from .proxy_target import resolve_qelos_proxy_target
from .sdk_factory import create_request_sdk


WorkspaceResolver = Callable[
    [Request, Dict[str, Any], List[Dict[str, Any]]],
    Union[
        Optional[Dict[str, Any]],
        Awaitable[Optional[Dict[str, Any]]],
    ],
]


def effective_skip_paths(config: QelosConfig) -> list[str]:
    paths = list(config.skip_paths or [])
    if config.disable_proxy:
        return paths
    if any("/api/".startswith(prefix) for prefix in paths):
        return paths
    return ["/api/", *paths]


def should_skip(request: Request, skip_paths: list[str]) -> bool:
    if not skip_paths:
        return False
    path = request.url.path or ""
    return any(path.startswith(prefix) for prefix in skip_paths)


def _me_url(base: str) -> str:
    return f"{base.rstrip('/')}/api/me"


async def _maybe_resolve_workspace(
    resolve_workspace: Optional[WorkspaceResolver],
    request: Request,
    user: Dict[str, Any],
    workspaces: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if resolve_workspace:
        result = resolve_workspace(request, user, workspaces)
        if inspect.isawaitable(result):
            return await result  # type: ignore[no-any-return]
        return result  # type: ignore[no-any-return]
    ws = user.get("workspace")
    return ws if isinstance(ws, dict) else None


def _apply_set_cookies(response: Response, values: list[str]) -> None:
    for value in values:
        response.headers.append("set-cookie", value)


class QelosIntegratorMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that attaches Qelos context on ``request.state.qelos``."""

    def __init__(
        self,
        app,
        *,
        config: QelosConfig,
        resolve_workspace: Optional[WorkspaceResolver] = None,
    ) -> None:
        super().__init__(app)
        self._config = config
        self._resolve_workspace = resolve_workspace
        self._skip_paths = effective_skip_paths(config)

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if should_skip(request, self._skip_paths):
            return await call_next(request)

        sdk = create_request_sdk(self._config, request)
        ctx = QelosRequestContext(sdk=sdk)
        request.state.qelos = ctx

        try:
            base = resolve_qelos_proxy_target(self._config)
            if not base and not self._config.api_token:
                if self._config.require_auth:
                    return JSONResponse({"code": "UNAUTHORIZED"}, status_code=401)
                response = await call_next(request)
                return response

            pending_set_cookies: list[str] = []
            original_host = request.headers.get("host")

            if base:
                me_headers: dict[str, str] = {}
                if request.headers.get("cookie"):
                    me_headers["cookie"] = request.headers["cookie"]
                if request.headers.get("authorization"):
                    me_headers["authorization"] = request.headers["authorization"]

                try:
                    async with httpx.AsyncClient() as client:
                        me_resp = await client.get(
                            _me_url(base),
                            headers=me_headers,
                            follow_redirects=False,
                        )
                except httpx.RequestError:
                    if self._config.require_auth:
                        return JSONResponse({"code": "UNAUTHORIZED"}, status_code=401)
                    response = await call_next(request)
                    return response

                try:
                    raw_cookies = me_resp.headers.get_list("set-cookie")
                except AttributeError:
                    sc = me_resp.headers.get("set-cookie")
                    raw_cookies = [sc] if sc else []
                for raw in raw_cookies:
                    pending_set_cookies.append(
                        rewrite_set_cookie_domain(raw, original_host),
                    )

                if me_resp.is_success:
                    try:
                        ctx.user = me_resp.json()
                    except Exception:
                        ctx.user = None
                else:
                    ctx.user = None

            if not ctx.user:
                if self._config.require_auth:
                    r = JSONResponse({"code": "UNAUTHORIZED"}, status_code=401)
                    _apply_set_cookies(r, pending_set_cookies)
                    return r
                response = await call_next(request)
                _apply_set_cookies(response, pending_set_cookies)
                return response

            try:
                ctx.workspaces = await sdk.workspaces.get_list()
            except Exception:
                ctx.workspaces = []

            ctx.workspace = await _maybe_resolve_workspace(
                self._resolve_workspace,
                request,
                ctx.user,
                ctx.workspaces,
            )

            response = await call_next(request)
            _apply_set_cookies(response, pending_set_cookies)
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
        require_auth: bool = False,
        skip_paths: Optional[List[str]] = None,
        disable_proxy: bool = False,
        sdk_options: Optional[Dict[str, Any]] = None,
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
                require_auth=require_auth,
                skip_paths=list(skip_paths or []),
                disable_proxy=disable_proxy,
                sdk_options=dict(sdk_options or {}),
            )
        super().__init__(
            app,
            config=resolved,
            resolve_workspace=resolve_workspace,
        )


qelos_middleware = QelosMiddleware
