# qelos-integrator-fastapi

FastAPI / Starlette middleware that calls the [qelos-sdk](https://pypi.org/project/qelos-sdk/) to identify the current user and their active workspace before your handlers run. The same contract as `@qelos/integrator-express`, `@qelos/integrator-fastify`, and the other Qelos integrators: attach context, resolve workspace, support token refresh.

## Install

```sh
pip install qelos-integrator-fastapi qelos-sdk
```

## Quick start

```python
from typing import Annotated, Optional

from fastapi import Depends, FastAPI
from qelos_integrator_fastapi import (
    QelosConfig,
    QelosIntegratorMiddleware,
    QelosRequestContext,
    get_qelos,
    require_user,
)

app = FastAPI()
app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://yourdomain.com"),
)


@app.get("/me")
async def me(qelos: Annotated[Optional[QelosRequestContext], Depends(get_qelos)]):
    return {
        "user": qelos.user if qelos else None,
        "workspace": qelos.workspace if qelos else None,
    }


@app.get("/private")
async def private(qelos: Annotated[QelosRequestContext, Depends(require_user)]):
    return qelos.user
```

Context lives on `request.state.qelos` (`QelosRequestContext`). User and workspace are plain dicts matching the JSON returned by the Qelos API.

## Behaviour

1. Reads the access token from `Authorization: Bearer …` or `q_access_token`, and the refresh token from `q_refresh_token`.
2. Builds a per-request `QelosSDK` bound to those tokens (`create_request_sdk`).
3. Calls `authentication.get_logged_in_user()` and `workspaces.get_list()`.
4. Picks the active workspace (first list item by default, or your `resolve_workspace` callable).
5. Attaches everything to `request.state.qelos`.

Anonymous requests leave `user` / `workspace` as `None` unless `require_auth=True`, which responds with `401` and body `{"code": "UNAUTHORIZED"}`.

## Token refresh

When tokens rotate, the optional `on_token_refresh` hook runs. The default implementation schedules `Set-Cookie` headers on the outgoing response (HTTP-only, `SameSite=Lax`, `Secure` when `app_url` is HTTPS).

Because Starlette does not expose the final `Response` until after inner middleware runs, the default hook records cookies on an internal buffer that is flushed onto the real response when the request completes. Custom hooks receive the same buffer as `TokenRefreshContext.response`; call `set_cookie` on it if you write cookies from the hook.

## Configuration

See `QelosConfig` in `qelos_integrator_fastapi.config`: `app_url`, optional `api_token`, cookie names, `require_auth`, `skip_paths`, and `sdk_options` (merged into `QelosSDKOptions`, with camelCase keys from Node configs normalized to snake_case).

## Requirements

- Python 3.9+
- FastAPI / Starlette (middleware is ASGI-level)
