---
title: FastAPI Integrator
editLink: true
---

# `qelos-integrator-fastapi`

FastAPI / Starlette middleware that resolves the current Qelos user, active
workspace, and a per-request SDK client *before* your handlers run, and
exposes them on `request.state.qelos`.

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
from qelos_integrator_fastapi import QelosConfig, QelosIntegratorMiddleware

app = FastAPI()
app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://your-qelos-instance.com"),
)
```

The middleware:

1. Reads the access token from `Authorization: Bearer …` or
   `q_access_token`, and the refresh token from `q_refresh_token`.
2. Builds a per-request `QelosSDK` instance bound to those tokens
   (`create_request_sdk`).
3. Calls `authentication.get_logged_in_user()` and
   `workspaces.get_list()`.
4. Picks the active workspace (first by default, or your
   `resolve_workspace` callable).
5. Attaches everything to `request.state.qelos`.

### All configuration options

```python
QelosConfig(
    app_url="https://your-qelos-instance.com",   # required

    # Service-to-service: skip cookies/refresh entirely.
    api_token="...",

    # Cookie names. Defaults shown.
    access_token_cookie="q_access_token",
    refresh_token_cookie="q_refresh_token",

    # Reject anonymous requests with 401. Defaults to False.
    require_auth=False,

    # Skip the middleware entirely for these path prefixes.
    skip_paths=["/health", "/metrics"],

    # Anything you want passed through to the per-request SDK.
    sdk_options={},
)
```

You can also pass `resolve_workspace=` and `on_token_refresh=` to
`add_middleware`:

```python
async def resolve_workspace(request, user, workspaces):
    target_id = request.headers.get("x-qelos-workspace")
    return next((w for w in workspaces if w["_id"] == target_id), workspaces[0] if workspaces else None)


app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://your-qelos-instance.com"),
    resolve_workspace=resolve_workspace,
)
```

## 3. Access user and workspace in your routes

The context is a `QelosRequestContext`:

```python
@dataclass
class QelosRequestContext:
    sdk: QelosSDK                      # bound to this request's tokens
    tokens: TokenPair                  # mutated in place when refreshed
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
`sdk.authentication.signin`). Qelos sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; the middleware reads them
on subsequent requests.

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

### Token refresh

When tokens rotate, the optional `on_token_refresh` hook runs. The default
implementation schedules `Set-Cookie` headers on the outgoing response
(HTTP-only, `SameSite=Lax`, `Secure` when `app_url` is HTTPS).

Because Starlette does not expose the final `Response` until after inner
middleware runs, the default hook records cookies on an internal
`CookieBuffer` that is flushed onto the real response when the request
completes. Custom hooks receive the same buffer as
`TokenRefreshContext.response`; call `set_cookie` on it if you write
cookies from the hook.

```python
from qelos_integrator_fastapi import TokenRefreshContext

async def my_refresh_hook(ctx: TokenRefreshContext) -> None:
    # ctx.response is a CookieBuffer until the real response exists.
    ctx.response.set_cookie(
        "q_access_token",
        ctx.new_tokens.access_token,
        httponly=True,
        samesite="lax",
    )
    if ctx.new_tokens.refresh_token:
        ctx.response.set_cookie(
            "q_refresh_token",
            ctx.new_tokens.refresh_token,
            httponly=True,
            samesite="lax",
        )

app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://your-qelos-instance.com"),
    on_token_refresh=my_refresh_hook,
)
```

Anonymous requests leave `user` / `workspace` as `None` unless
`require_auth=True`, which responds with `401` and body
`{"code": "UNAUTHORIZED"}`.

### Service-to-service (no end user)

Set `api_token` to skip cookies and refresh entirely:

```python
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
- **`request.state.qelos` is `None` on `skip_paths`.** Always go through
  `Depends(get_qelos)` (which returns `Optional[...]`) or
  `Depends(require_user)` (which raises `401`) instead of accessing the
  attribute blindly.
- **Anonymous requests don't raise by default.** `qelos.user` and
  `qelos.workspace` will simply be `None`. Switch to `require_auth=True`
  or use `Depends(require_user)` when you want a hard `401`.
- **Cookie writes are buffered.** A `CookieBuffer` collects
  `Set-Cookie` operations during the request; the real response receives
  them once Starlette resolves it. If you write a custom
  `on_token_refresh`, use `ctx.response.set_cookie(...)` rather than
  trying to grab the underlying `Response` directly.
- **`Secure` cookies are based on `app_url`.** Local `http://` instances
  get cookies without `Secure` so browsers accept them; production
  `https://` instances get `Secure` automatically.
- **Workspace selection defaults to the first workspace.** Supply
  `resolve_workspace=` if your users belong to multiple workspaces.
- **`sdk_options` is normalized.** Camel-case keys from a Node-style
  config (e.g. `accessToken`) are mapped to the snake_case fields the
  Python SDK expects, so you can pass the same shape your other
  integrator services use.
- **Don't reuse the per-request SDK across requests.** It is bound to a
  specific token pair. Build a fresh `QelosSDK(api_token=...)` for
  background workers and scripts.
