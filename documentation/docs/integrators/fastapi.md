---
title: FastAPI Integrator
editLink: true
---

# `qelos-integrator-fastapi`

FastAPI / Starlette middleware that resolves the current Qelos user, active
workspace, and a per-request SDK client *before* your handlers run, and
exposes them on `request.state.qelos`. Optional `create_qelos_proxy_router`
proxies `/api/**` to the managed Qelos app with `Set-Cookie` domain rewrite.

This is the Python implementation of the Qelos integrator contract — the
same shape exposed by `@qelos/integrator-express`,
`@qelos/integrator-fastify`, `@qelos/integrator-nest`,
`@qelos/integrator-next`, and `@qelos/integrator-nuxt`.

If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
pip install qelos-integrator-fastapi qelos-sdk
```

Requirements:

- **Python 3.9+**
- **FastAPI / Starlette.** The middleware is ASGI-level, so any Starlette
  app works too.

## 2. Configure the middleware

```python
from fastapi import FastAPI
from qelos_integrator_fastapi import (
    QelosConfig,
    QelosIntegratorMiddleware,
    create_qelos_proxy_router,
)

cfg = QelosConfig(
    app_url="https://your-qelos-instance.com",
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

app.add_middleware(qelos_middleware, app_url="https://your-qelos-instance.com")
```

The middleware:

1. Builds a request-scoped `QelosSDK` (`create_request_sdk`).
2. Resolves the upstream origin the same way as the proxy (`QELOS_PROXY_TARGET`
   → `QELOS_IP` → `QELOS_API_IP` → `app_url`).
3. If neither a proxy target nor `api_token` is configured, anonymous requests
   pass through (or **401** when `require_auth` is true).
4. When a target exists, issues `GET {target}/api/me` with inbound `Cookie` and
   `Authorization` forwarded; rewrites each upstream `Set-Cookie` `Domain=` to
   the inbound `Host`.
5. On **2xx** JSON, sets `user`; loads `workspaces` via `sdk.workspaces.get_list()`.
6. Sets `workspace` from `resolve_workspace` or from `user["workspace"]` —
   **not** from `workspaces[0]`.

### All configuration options

```python
QelosConfig(
    app_url="https://your-qelos-instance.com",   # required

    # Service-to-service: skip cookie forwarding on the SDK.
    api_token="...",

    # Reject anonymous requests with 401. Defaults to False.
    require_auth=False,

    # Skip the middleware entirely for these path prefixes.
    skip_paths=["/health", "/metrics"],

    # When False (default), /api/ is prepended to skip_paths when using the
    # proxy router so /api/** is not double-handled by user resolution.
    disable_proxy=False,

    # Extra options merged into the per-request SDK (camelCase normalized).
    sdk_options={},
)
```

Optional workspace override:

```python
async def resolve_workspace(request, user, workspaces):
    target_id = request.headers.get("x-qelos-workspace")
    if target_id:
        for w in workspaces:
            if w.get("_id") == target_id:
                return w
    ws = user.get("workspace")
    return ws if isinstance(ws, dict) else None


app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://your-qelos-instance.com"),
    resolve_workspace=resolve_workspace,
)
```

See the package README (`README.md` inside `qelos-integrator-fastapi`) for
proxy routing, env overrides, and WebSocket behavior.

## 3. Access user and workspace in your routes

The context is a `QelosRequestContext`:

```python
@dataclass
class QelosRequestContext:
    sdk: QelosSDK                      # bound to this request's cookies / headers
    user: Optional[Dict[str, Any]]     # None for anonymous requests
    workspace: Optional[Dict[str, Any]]
    workspaces: List[Dict[str, Any]]
```

User and workspace come back as plain dicts matching the JSON returned by
the Qelos API.

Inject it via the `get_qelos` and `require_user` dependencies:

```python
from typing import Annotated, Optional
from fastapi import Depends, FastAPI
from qelos_integrator_fastapi import QelosRequestContext, get_qelos, require_user

@app.get("/me")
async def me(qelos: Annotated[Optional[QelosRequestContext], Depends(get_qelos)]):
    return {
        "user": qelos.user if qelos else None,
        "workspace": qelos.workspace if qelos else None,
    }


@app.get("/private")
async def private(qelos: Annotated[QelosRequestContext, Depends(require_user)]):
    # 401 returned automatically when there's no user.
    return qelos.user
```

You can also read it straight off `request.state.qelos`:

```python
from starlette.requests import Request

@app.get("/me-raw")
async def me_raw(request: Request):
    qelos = getattr(request.state, "qelos", None)
    return {"user": qelos.user if qelos else None}
```

`require_user` raises `HTTPException(status_code=401, detail={"code":
"UNAUTHORIZED"})` when no user is attached — equivalent to
`config.require_auth=True` but scoped per-route.

## 4. Handle authentication

The integrator only **resolves** identity from existing tokens; it does
not host the login UI.

### Cookie-based session (recommended for browsers)

Most flows let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). Qelos sets session cookies on the user's browser;
subsequent requests carry them and the middleware forwards the full `Cookie`
header to `/api/me` and to the SDK.

You can also drive the login from a FastAPI route. The `qelos-sdk`
package returns the `Set-Cookie` header so you can forward it:

```python
from fastapi import FastAPI, Response
from qelos_sdk import QelosSDK

@app.post("/auth/login")
async def login(body: dict, response: Response):
    sdk = QelosSDK(app_url="https://your-qelos-instance.com")
    result = await sdk.authentication.signin(body)
    set_cookie = result.get("headers", {}).get("set-cookie")
    if set_cookie:
        response.headers.append("set-cookie", set_cookie)
    return {"user": result["payload"]["user"]}
```

### Social login

```python
from fastapi.responses import RedirectResponse

@app.get("/auth/google")
async def google():
    sdk = QelosSDK(app_url="https://your-qelos-instance.com")
    url = sdk.authentication.get_social_login_url(
        "google",
        return_url="https://your-app.com/dashboard",
    )
    return RedirectResponse(url)


@app.get("/auth/callback")
async def callback(rt: str):
    sdk = QelosSDK(app_url="https://your-qelos-instance.com")
    result = await sdk.authentication.exchange_auth_callback(rt)
    response = RedirectResponse("/")
    set_cookie = result.get("headers", {}).get("set-cookie")
    if set_cookie:
        response.headers.append("set-cookie", set_cookie)
    return response
```

### Cookies and refresh

Session rotations issued by Qelos reach your app as `Set-Cookie` on the
`/api/me` response (middleware) or on responses from SDK calls your handlers
make. The middleware appends rewritten cookies to the outgoing ASGI response.
For additional refresh behavior when constructing the SDK yourself, see
[Cookie Token Lifecycle](../auth/cookie-tokens.md) and the SDK reference.

Anonymous requests leave `user` / `workspace` as `None` unless
`require_auth=True`, which responds with `401` and body
`{"code": "UNAUTHORIZED"}`.

### Service-to-service (no end user)

Set `api_token` so the SDK authenticates with a static token instead of
forwarding browser cookies. User resolution still uses `GET /api/me` when a
proxy target can be resolved unless you rely on anonymous middleware with
token-only SDK usage.

```python
import os

QelosConfig(
    app_url="https://your-qelos-instance.com",
    api_token=os.environ["QELOS_API_TOKEN"],
)
```

## 5. Query entities

The SDK on `qelos.sdk` is already authenticated as the current user, so
blueprint permissions are enforced for free:

```python
@app.get("/products")
async def list_products(qelos: Annotated[QelosRequestContext, Depends(require_user)]):
    return await qelos.sdk.entities("products").get_list({"status": "active"})


@app.post("/products", status_code=201)
async def create_product(
    body: dict,
    qelos: Annotated[QelosRequestContext, Depends(require_user)],
):
    return await qelos.sdk.entities("products").create(body)
```

The full surface — `get_list`, `create`, `update`, `remove`, etc. — is
in the [Blueprints Operations reference](../sdk/blueprints_operations.md)
(the SDK shape mirrors the TypeScript SDK; method names are
snake_case in Python).

## 6. Common patterns and gotchas

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `qelos-integrator-fastapi` — they
  talk to the gateway directly.
- **`request.state.qelos` can be absent on `skip_paths`.** Always go through
  `Depends(get_qelos)` (which returns `Optional[...]`) or
  `Depends(require_user)` (which raises `401`) instead of accessing the
  attribute blindly.
- **Anonymous requests don't raise by default.** `qelos.user` and
  `qelos.workspace` will simply be `None`. Switch to `require_auth=True`
  or use `Depends(require_user)` when you want a hard `401`.
- **`Secure` cookies:** the middleware does not strip `Secure` from rotated
  cookies. Over plain HTTP, browsers may drop them — terminate TLS on your
  host or configure Qelos for local dev.
- **Workspace selection defaults to `user["workspace"]` from `/api/me`, not
  the first list entry.** Supply `resolve_workspace=` when you need another
  rule (for example an `x-qelos-workspace` header).
- **`sdk_options`:** camelCase keys from a Node-style config are normalized
  to snake_case for the Python SDK.
- **Don't reuse the per-request SDK across requests.** Build a fresh
  `QelosSDK(api_token=...)` for background workers and scripts.
