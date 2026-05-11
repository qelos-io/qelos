from __future__ import annotations

import pytest

from qelos_integrator_fastapi import QelosConfig
from qelos_integrator_fastapi.proxy_target import resolve_qelos_proxy_target

_ENV_KEYS = ("QELOS_PROXY_TARGET", "QELOS_IP", "QELOS_API_IP")


@pytest.fixture(autouse=True)
def clear_proxy_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in _ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_prefers_qelos_proxy_target(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_PROXY_TARGET", "https://from-proxy-target.example")
    monkeypatch.setenv("QELOS_IP", "https://from-qelos-ip.example")
    monkeypatch.setenv("QELOS_API_IP", "https://from-qelos-api-ip.example")
    cfg = QelosConfig(app_url="https://from-app-url.example")
    assert resolve_qelos_proxy_target(cfg) == "https://from-proxy-target.example"


def test_falls_back_to_qelos_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_IP", "https://from-qelos-ip.example")
    monkeypatch.setenv("QELOS_API_IP", "https://from-qelos-api-ip.example")
    cfg = QelosConfig(app_url="https://from-app-url.example")
    assert resolve_qelos_proxy_target(cfg) == "https://from-qelos-ip.example"


def test_falls_back_to_qelos_api_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_API_IP", "https://from-qelos-api-ip.example")
    cfg = QelosConfig(app_url="https://from-app-url.example")
    assert resolve_qelos_proxy_target(cfg) == "https://from-qelos-api-ip.example"


def test_falls_back_to_app_url_when_no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    cfg = QelosConfig(app_url="https://from-app-url.example")
    assert resolve_qelos_proxy_target(cfg) == "https://from-app-url.example"


def test_returns_none_when_nothing_configured() -> None:
    cfg = QelosConfig(app_url="")
    assert resolve_qelos_proxy_target(cfg) is None


def test_whitespace_only_env_treated_as_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_PROXY_TARGET", "   ")
    monkeypatch.setenv("QELOS_IP", "\t")
    cfg = QelosConfig(app_url="https://from-app-url.example")
    assert resolve_qelos_proxy_target(cfg) == "https://from-app-url.example"


def test_trims_app_url() -> None:
    cfg = QelosConfig(app_url="  https://trimmed.example  ")
    assert resolve_qelos_proxy_target(cfg) == "https://trimmed.example"
