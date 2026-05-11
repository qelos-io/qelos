from __future__ import annotations

from urllib.parse import urlparse

import httpx
import pytest
from fastapi import Depends, FastAPI, Request
from starlette.testclient import TestClient

from qelos_sdk import QelosSDK

from qelos_integrator_fastapi import (
    QelosConfig,
    QelosIntegratorMiddleware,
    get_qelos_sdk,
    get_qelos_user,
    qelos_middleware,
)

MINIMAL_USER = {
    "_id": "user-1",
    "username": "alice",
    "email": "alice@example.com",
    "fullName": "Alice Example",
    "firstName": "Alice",
    "lastName": "Example",
    "birthDate": "1990-01-01",
    "roles": [],
    "metadata": {},
    "workspace": {"_id": "ws-1", "name": "Primary", "labels": []},
}

WORKSPACE_A = {"_id": "ws-1", "name": "Primary", "labels": []}


def _path(url: object) -> str:
    return urlparse(str(url)).path


def _set_cookie_values(response: object) -> list[str]:
    h = response.headers
    if hasattr(h, "get_list"):
        return list(h.get_list("set-cookie"))
    raw = h.get("set-cookie")
    return [raw] if raw else []


@pytest.fixture
def mock_http(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_request(self: httpx.AsyncClient, method: str, url, **kwargs):  # type: ignore[no-untyped-def]
        path = _path(url)
        headers = kwargs.get("headers") or {}
        cookie = None
        for k, v in headers.items():
            if str(k).lower() == "cookie":
                cookie = v
                break

        if path.endswith("/api/me"):
            if not cookie:
                return httpx.Response(401, json={"error": "Unauthorized"})
            return httpx.Response(
                200,
                json=MINIMAL_USER,
                headers={"set-cookie": "sid=1; Domain=.upstream.test; Path=/"},
            )
        if path.rstrip("/").endswith("/api/workspaces"):
            return httpx.Response(200, json=[WORKSPACE_A])
        return httpx.Response(404, json={"error": "not found"})

    monkeypatch.setattr(httpx.AsyncClient, "request", _fake_request)


def test_middleware_attaches_user_workspace(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
    )

    @app.get("/ctx")
    def ctx(request: Request):
        q = request.state.qelos
        return {
            "userId": q.user.get("_id") if q.user else None,
            "workspaceId": q.workspace.get("_id") if q.workspace else None,
            "workspaceCount": len(q.workspaces),
        }

    client = TestClient(app)
    res = client.get("/ctx", headers={"cookie": "session=abc"})
    assert res.status_code == 200
    body = res.json()
    assert body["userId"] == "user-1"
    assert body["workspaceId"] == "ws-1"
    assert body["workspaceCount"] == 1


def test_forwards_set_cookie_from_me_with_domain_rewrite(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
    )

    @app.get("/x")
    def _x() -> dict[str, str]:
        return {"ok": "1"}

    client = TestClient(app)
    res = client.get("/x", headers={"cookie": "session=abc"})
    assert res.status_code == 200
    cookies = _set_cookie_values(res)
    assert cookies
    assert any("Domain=testserver" in c for c in cookies)


def test_anonymous_without_credentials(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
    )

    @app.get("/x")
    def x(request: Request):
        q = request.state.qelos
        return {"user": q.user}

    client = TestClient(app)
    res = client.get("/x")
    assert res.status_code == 200
    assert res.json()["user"] is None


def test_require_auth_401(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test", require_auth=True),
    )
    app.add_api_route("/x", lambda: {"ok": True}, methods=["GET"])

    client = TestClient(app)
    res = client.get("/x")
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHORIZED"


def test_skip_paths(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test", skip_paths=["/health"]),
    )

    @app.get("/health")
    def health(request: Request):
        return {"has": hasattr(request.state, "qelos")}

    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["has"] is False


def test_skip_under_api_when_proxy_enabled(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
    )

    @app.get("/api/ping")
    def ping(request: Request):
        return {"has": hasattr(request.state, "qelos")}

    client = TestClient(app)
    res = client.get("/api/ping")
    assert res.status_code == 200
    assert res.json()["has"] is False


def test_resolve_workspace(monkeypatch: pytest.MonkeyPatch) -> None:
    ws_b = {"_id": "ws-2", "name": "Second", "labels": []}

    async def _fake_request(self: httpx.AsyncClient, method: str, url, **kwargs):  # type: ignore[no-untyped-def]
        path = _path(url)
        headers = kwargs.get("headers") or {}
        cookie = next((v for k, v in headers.items() if str(k).lower() == "cookie"), None)
        if path.endswith("/api/me"):
            if not cookie:
                return httpx.Response(401, json={})
            return httpx.Response(200, json={**MINIMAL_USER, "workspace": WORKSPACE_A})
        if path.rstrip("/").endswith("/api/workspaces"):
            return httpx.Response(200, json=[WORKSPACE_A, ws_b])
        return httpx.Response(404, json={})

    monkeypatch.setattr(httpx.AsyncClient, "request", _fake_request)

    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
        resolve_workspace=lambda req, user, workspaces: next(
            (w for w in workspaces if w["_id"] == "ws-2"),
            None,
        ),
    )

    @app.get("/w")
    def w(request: Request):
        q = request.state.qelos
        return {"id": q.workspace.get("_id") if q.workspace else None}

    client = TestClient(app)
    res = client.get("/w", headers={"cookie": "session=1"})
    assert res.status_code == 200
    assert res.json()["id"] == "ws-2"


def test_qelos_middleware_flat_kwargs(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(qelos_middleware, app_url="http://example.test")

    @app.get("/ctx")
    def ctx(request: Request):
        q = request.state.qelos
        return {
            "userId": q.user.get("_id") if q.user else None,
            "workspaceId": q.workspace.get("_id") if q.workspace else None,
        }

    client = TestClient(app)
    res = client.get("/ctx", headers={"cookie": "session=1"})
    assert res.status_code == 200
    body = res.json()
    assert body["userId"] == "user-1"
    assert body["workspaceId"] == "ws-1"


def test_get_qelos_user_and_sdk(mock_http: None) -> None:
    app = FastAPI()
    app.add_middleware(qelos_middleware, app_url="http://example.test")

    @app.get("/typed")
    def typed(
        user=Depends(get_qelos_user),
        sdk=Depends(get_qelos_sdk),
    ):
        return {
            "full_name": user.full_name,
            "user_id": user.id,
            "sdk_is_qelos": isinstance(sdk, QelosSDK),
        }

    client = TestClient(app)
    res = client.get("/typed", headers={"cookie": "session=1"})
    assert res.status_code == 200
    body = res.json()
    assert body["full_name"] == "Alice Example"
    assert body["user_id"] == "user-1"
    assert body["sdk_is_qelos"] is True


def test_get_qelos_sdk_requires_middleware(mock_http: None) -> None:
    app = FastAPI()

    @app.get("/orphan")
    def orphan(sdk=Depends(get_qelos_sdk)):
        return {"ok": sdk is not None}

    client = TestClient(app)
    res = client.get("/orphan")
    assert res.status_code == 500
    assert res.json()["detail"]["code"] == "QELOS_MIDDLEWARE_MISSING"
