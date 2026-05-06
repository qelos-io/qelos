from __future__ import annotations

from urllib.parse import urlparse

import httpx
import pytest
from fastapi import FastAPI, Request
from starlette.testclient import TestClient

from qelos_integrator_fastapi import QelosConfig, QelosIntegratorMiddleware

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
}

WORKSPACE_A = {"_id": "ws-1", "name": "Primary", "labels": []}


def _path(url: object) -> str:
    return urlparse(str(url)).path


@pytest.fixture
def mock_http(monkeypatch: pytest.MonkeyPatch) -> None:
    async def request(self: httpx.AsyncClient, method: str, url, **kwargs):  # type: ignore[no-untyped-def]
        path = _path(url)
        if path.endswith("/api/me"):
            return httpx.Response(200, json=MINIMAL_USER)
        if path.rstrip("/").endswith("/api/workspaces"):
            return httpx.Response(200, json=[WORKSPACE_A])
        return httpx.Response(404, json={"error": "not found"})

    monkeypatch.setattr(httpx.AsyncClient, "request", request)


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
    res = client.get(
        "/ctx",
        headers={"cookie": "q_access_token=a; q_refresh_token=r"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["userId"] == "user-1"
    assert body["workspaceId"] == "ws-1"
    assert body["workspaceCount"] == 1


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


def test_resolve_workspace(monkeypatch: pytest.MonkeyPatch) -> None:
    ws_b = {"_id": "ws-2", "name": "Second", "labels": []}

    async def request(self: httpx.AsyncClient, method: str, url, **kwargs):  # type: ignore[no-untyped-def]
        path = _path(url)
        if path.endswith("/api/me"):
            return httpx.Response(200, json=MINIMAL_USER)
        if path.rstrip("/").endswith("/api/workspaces"):
            return httpx.Response(200, json=[WORKSPACE_A, ws_b])
        return httpx.Response(404, json={})

    monkeypatch.setattr(httpx.AsyncClient, "request", request)

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
    res = client.get(
        "/w",
        headers={"cookie": "q_access_token=a; q_refresh_token=r"},
    )
    assert res.status_code == 200
    assert res.json()["id"] == "ws-2"


def test_on_token_refresh(monkeypatch: pytest.MonkeyPatch) -> None:
    me_calls = {"n": 0}

    async def request(self: httpx.AsyncClient, method: str, url, **kwargs):  # type: ignore[no-untyped-def]
        path = _path(url)
        if path.endswith("/api/token/refresh"):
            assert method.lower() == "post"
            return httpx.Response(
                200,
                json={
                    "payload": {
                        "token": "new-access",
                        "refreshToken": "new-refresh",
                        "user": MINIMAL_USER,
                    },
                },
            )
        if path.endswith("/api/me"):
            me_calls["n"] += 1
            if me_calls["n"] == 1:
                return httpx.Response(401, json={"error": "Unauthorized"})
            return httpx.Response(200, json=MINIMAL_USER)
        if path.rstrip("/").endswith("/api/workspaces"):
            return httpx.Response(200, json=[WORKSPACE_A])
        return httpx.Response(404, json={})

    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    refreshed = {"ok": False}

    async def on_refresh(ctx):  # type: ignore[no-untyped-def]
        refreshed["ok"] = True
        assert ctx.new_tokens.access_token == "new-access"
        assert ctx.new_tokens.refresh_token == "new-refresh"

    app = FastAPI()
    app.add_middleware(
        QelosIntegratorMiddleware,
        config=QelosConfig(app_url="http://example.test"),
        on_token_refresh=on_refresh,
    )

    @app.get("/z")
    def z(request: Request):
        q = request.state.qelos
        return {
            "userId": q.user.get("_id") if q.user else None,
            "access": q.tokens.access_token,
        }

    client = TestClient(app)
    res = client.get(
        "/z",
        headers={"cookie": "q_access_token=stale; q_refresh_token=refresh-ok"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["userId"] == "user-1"
    assert body["access"] == "new-access"
    assert refreshed["ok"] is True
    assert me_calls["n"] >= 2
