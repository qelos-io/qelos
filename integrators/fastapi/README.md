# qelos-integrator-fastapi

FastAPI / Starlette integrator for [Qelos](https://qelos.io). It runs as ASGI
middleware so your FastAPI host acts as a same-origin BFF for a managed Qelos
app: you can mount a catch-all ``/api/{path:path}`` router that proxies to
Qelos, and every other request gets ``request.state.qelos`` populated from
``GET /api/me`` before your handlers run.

## Install

```sh
pip install qelos-integrator-fastapi qelos-sdk
```

Requires **Python 3.9+**. The middleware and proxy use **httpx** (declared as a
direct dependency) and rely on httpx’s handling of multiple ``Set-Cookie``
response headers (``Headers.get_list("set-cookie")`` or equivalent) when
piping upstream cookies back to the browser.

## Configure

```python
from fastapi import FastAPI
from qelos_integrator_fastapi import QelosConfig, QelosIntegratorMiddleware, create_qelos_proxy_router

cfg = QelosConfig(
    app_url="https://your-qelos-app.com",
    require_auth=False,
    skip_paths=["/health"],
)
app = FastAPI()
app.add_middleware(QelosIntegratorMiddleware, config=cfg)
app.include_router(create_qelos_proxy_router(cfg))
```

Or with the Starlette-friendly alias:

```python
from qelos_integrator_fastapi import qelos_middleware

app.add_middleware(qelos_middleware, app_url="https://your-qelos-app.com")
```

## API proxy

``create_qelos_proxy_router`` returns an ``APIRouter`` that matches
``/api/{path:path}`` for ``GET``, ``POST``, ``PUT``, ``PATCH``, ``DELETE``,
``OPTIONS``, and ``HEAD``. Include it on your app **after** your own
``/api/...`` routes so explicit handlers stay authoritative; the proxy only
serves paths nothing else matched.

The proxy forwards the inbound ``Cookie`` header as-is (the Qelos session
cookie name is opaque), sets upstream ``Host`` to the managed-app origin, and
streams the response back. Every upstream ``Set-Cookie`` is forwarded with the
``Domain=`` attribute rewritten to the inbound request’s ``Host`` (port
stripped) so the browser stores first-party cookies on your FastAPI domain.

### Resolving the proxy target

The managed Qelos app URL (``QelosConfig.app_url``) is the default proxy target.
Environment variables are **dev-time overrides** when ``app_url`` is not
reachable from the machine running FastAPI:

1. ``QELOS_PROXY_TARGET``
2. ``QELOS_IP``
3. ``QELOS_API_IP``
4. ``QelosConfig.app_url``

Whitespace-only env values are ignored. If nothing resolves, the proxy responds
with **503** and a JSON body with ``code: QELOS_PROXY_NOT_CONFIGURED``.

### Opting out

Set ``disable_proxy=True`` on ``QelosConfig`` when constructing the middleware.
When the proxy is **not** disabled, ``/api/`` is automatically prepended to
``skip_paths`` (unless already covered by an existing prefix) so inbound
``/api/**`` requests are not processed by the user-resolution middleware. That
avoids double upstream calls to ``/api/me`` and cookie-rewrite loops when you use
the catch-all proxy.

WebSocket upgrades are **not** proxied; the router returns **501** for
``Upgrade: websocket``.

## Middleware

On every request that is not skipped, the middleware:

1. Builds a request-scoped ``QelosSDK`` (see below).
2. Resolves the upstream origin the same way as the proxy
   (``QELOS_PROXY_TARGET`` → ``QELOS_IP`` → ``QELOS_API_IP`` → ``app_url``).
3. If neither a proxy target nor ``api_token`` is configured, anonymous
   requests pass through (or **401** when ``require_auth`` is true).
4. When a target exists, issues ``GET {target}/api/me`` with the inbound
   ``Cookie`` and ``Authorization`` headers forwarded verbatim. For each upstream
   ``Set-Cookie``, rewrites ``Domain=`` to the inbound ``Host`` and appends it
   to the outgoing ASGI response.
5. On HTTP **2xx** with JSON, that body becomes ``request.state.qelos.user``.
   On any other status or transport error, ``user`` is ``None`` (and **401**
   if ``require_auth``).
6. Loads ``sdk.workspaces.get_list()`` (errors become an empty list).
7. Sets ``workspace`` from your optional ``resolve_workspace`` callback, or
   else from ``user["workspace"]`` as returned by ``/api/me`` — **not** from
   ``workspaces[0]``.

``request.state.qelos`` is a ``QelosRequestContext``:

| field        | description |
|--------------|-------------|
| ``user``     | The ``/api/me`` JSON object, or ``None`` when anonymous. |
| ``workspace``| The active workspace dict, or ``None``. |
| ``workspaces``| List of workspace dicts from the Qelos API. |
| ``sdk``      | ``QelosSDK`` bound to live ``Cookie`` / ``Authorization`` on each call. |

### SDK behaviour

``create_request_sdk(config, request)`` merges ``config.sdk_options`` into
``QelosSDKOptions`` (camelCase keys from Node configs are normalized to
snake_case). If ``api_token`` is set, the SDK uses it and skips cookies.
Otherwise an ``extra_headers`` hook forwards the current request’s ``Cookie``
and ``Authorization`` on every SDK request — no mutable token state and no
client-side refresh logic.

> The middleware does not strip ``Secure`` from rotated cookies. Over plain
> HTTP, browsers may drop ``Secure`` cookies — configure Qelos accordingly or
> terminate TLS on your FastAPI host.

## FastAPI dependencies

```python
from typing import Annotated, Optional

from fastapi import Depends, FastAPI
from qelos_integrator_fastapi import QelosRequestContext, get_qelos, require_user

@app.get("/me")
async def me(qelos: Annotated[Optional[QelosRequestContext], Depends(get_qelos)]):
    return {"user": qelos.user if qelos else None}

@app.get("/private")
async def private(qelos: Annotated[QelosRequestContext, Depends(require_user)]):
    return qelos.user
```

Typed user model: ``get_qelos_user`` → ``QelosUser`` (Pydantic).

## Workspace resolution

``user["workspace"]`` is only present when the user has activated a workspace
on the Qelos side. To override selection, pass ``resolve_workspace`` to
``QelosIntegratorMiddleware`` / ``qelos_middleware`` — a callable
``(request, user, workspaces)`` (sync or async) returning a workspace dict or
``None``.

## API token mode

For service-to-service traffic, set ``api_token`` on ``QelosConfig``. The SDK
authenticates with that static token instead of forwarding browser cookies.
User resolution still uses ``GET /api/me`` when a proxy target can be resolved
from ``app_url`` or the dev override env vars; keep ``app_url`` set to your
managed Qelos origin unless you intentionally run in anonymous middleware mode
with token-only SDK calls.

## Local development without a Qelos tenant

Dev mock mode serves the proxy, the per-request SDK and the middleware's
`/api/me` lookup from a local mimic of the Qelos API instead of a real tenant.

**Decision.** The mimic is the TypeScript package
[`@qelos/dev-mock`](../../packages/dev-mock), which cannot run in-process in
Python. The integrator therefore uses a **Node sidecar**: it spawns
`npx @qelos/dev-mock serve --dir <folder> --port <p>` (a minimal `serve` bin
built on `node:http` and the package's `handle`) and then points the existing
proxy / SDK at `http://127.0.0.1:<port>` as the Qelos origin. Nothing else in
the request path changes, and non-mock behaviour is untouched.

```python
cfg = QelosConfig(app_url="https://your-qelos-app.com", mock="./qelos-mock")  # or mock=True
app = FastAPI(lifespan=qelos_mock_lifespan(cfg))  # start on startup, terminate on shutdown
```

or without code changes:

```sh
QELOS_MOCK=1 uvicorn app:app --reload              # in-memory state
QELOS_MOCK=./qelos-mock uvicorn app:app --reload   # folder with `qelos pull`/`qelos dump` artifacts + JSON state
QELOS_MOCK_URL=http://127.0.0.1:4555 uvicorn ...   # use an already-running mock, nothing is spawned
```

| Option / env | Meaning |
|---|---|
| `mock` / `QELOS_MOCK` | `True`/`1`/`true`, or a folder path. `False`/`0` disables. Config wins over env. |
| `mock_url` / `QELOS_MOCK_URL` | Existing mock server origin; skips spawning. |
| `mock_port` | Sidecar port (default `0` = free port). |
| `mock_command` | Launcher override (default `["npx", "--yes", "@qelos/dev-mock"]`). |

Behaviour:

- **Lazy start.** Without the lifespan, the sidecar is spawned on first use
  (first proxied request / SDK creation). Startup waits for the sidecar's
  ready line plus a `/__qelos_mock__/health` check (30 s timeout).
- **Cleanup.** The lifespan terminates the process on shutdown; an `atexit`
  hook and `stop_mock_sidecars()` cover other cases.
- **Missing Node.** If `npx` is not on `PATH` a `QelosMockError` explains how
  to install Node or start the mock yourself and use `QELOS_MOCK_URL`.
- **Production guard.** Mock mode raises `QelosMockProductionError` when
  `ENV`, `APP_ENV`, `PYTHON_ENV`, `NODE_ENV` or `FASTAPI_ENV` is
  `production`/`prod`, or when `DEBUG` is explicitly falsy (`0`/`false`), and
  never spawns anything in that case. Leave `QELOS_MOCK` unset in production.
