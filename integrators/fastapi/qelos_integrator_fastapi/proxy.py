from __future__ import annotations

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.datastructures import MutableHeaders

from .config import QelosConfig
from .cookies import rewrite_set_cookie_domain
from .proxy_target import resolve_qelos_proxy_target

HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "host",
        "content-length",
    },
)

_PROXY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]


def _target_host_header(base: str) -> str:
    p = urlparse(base.rstrip("/"))
    if not p.scheme or not p.hostname:
        raise ValueError("invalid proxy base URL")
    if p.port and p.port not in (80, 443):
        return f"{p.hostname}:{p.port}"
    return p.hostname


def _forwarded_headers(request: Request, target_host: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in request.headers.items():
        if key.lower() in HOP_BY_HOP:
            continue
        out[key] = value
    out["host"] = target_host
    return out


def create_qelos_proxy_router(config: QelosConfig) -> APIRouter:
    """Catch-all ``/api/{path:path}`` reverse proxy to the configured Qelos origin.

    Mount on your FastAPI app **after** your own ``/api/...`` routes so explicit
    handlers take precedence::

        from fastapi import FastAPI
        from qelos_integrator_fastapi import create_qelos_proxy_router, QelosConfig

        app = FastAPI()
        app.include_router(create_qelos_proxy_router(QelosConfig(app_url="https://your-app.qelos.io")))

    Responds with ``503`` when no proxy target is configured. Does not proxy
    WebSocket upgrades.
    """
    router = APIRouter()

    @router.api_route("/api/{path:path}", methods=_PROXY_METHODS)
    async def _qelos_api_proxy(path: str, request: Request) -> Response:
        if request.headers.get("upgrade", "").lower() == "websocket":
            return Response(
                status_code=501,
                content=b"WebSocket upgrades are not proxied by qelos-integrator-fastapi.",
            )

        base = resolve_qelos_proxy_target(config)
        if not base:
            return JSONResponse(
                status_code=503,
                content={
                    "code": "QELOS_PROXY_NOT_CONFIGURED",
                    "message": (
                        "[qelos-integrator-fastapi] Qelos API proxy is not configured. "
                        "Set QelosConfig.app_url (or QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP)."
                    ),
                },
            )

        try:
            target_host = _target_host_header(base)
        except ValueError:
            return JSONResponse(
                status_code=502,
                content={
                    "code": "QELOS_PROXY_BAD_TARGET",
                    "message": "[qelos-integrator-fastapi] Invalid proxy target URL.",
                },
            )

        upstream_url = f"{base.rstrip('/')}/api/{path}"
        if request.url.query:
            upstream_url += f"?{request.url.query}"

        inbound_host = request.headers.get("host")
        fwd = _forwarded_headers(request, target_host)

        body: bytes | None = None
        if request.method not in ("GET", "HEAD"):
            body = await request.body()

        client = httpx.AsyncClient(timeout=120.0)
        try:
            up_req = client.build_request(
                request.method,
                upstream_url,
                headers=fwd,
                content=body,
            )
            up_resp = await client.send(up_req, stream=True)
        except httpx.RequestError as err:
            await client.aclose()
            return JSONResponse(
                status_code=502,
                content={"code": "QELOS_PROXY_UPSTREAM_ERROR", "message": str(err)},
            )

        out_headers = MutableHeaders()
        for key, value in up_resp.headers.items():
            lk = key.lower()
            if lk in HOP_BY_HOP or lk == "set-cookie" or lk == "content-type":
                continue
            out_headers[key] = value

        try:
            raw_list = up_resp.headers.get_list("set-cookie")
        except AttributeError:
            sc = up_resp.headers.get("set-cookie")
            raw_list = [sc] if sc else []

        for raw in raw_list:
            out_headers.append(
                "set-cookie",
                rewrite_set_cookie_domain(raw, inbound_host),
            )

        async def stream_body():
            try:
                async for chunk in up_resp.aiter_bytes():
                    yield chunk
            finally:
                await up_resp.aclose()
                await client.aclose()

        return StreamingResponse(
            stream_body(),
            status_code=up_resp.status_code,
            headers=out_headers,
            media_type=up_resp.headers.get("content-type"),
        )

    return router
