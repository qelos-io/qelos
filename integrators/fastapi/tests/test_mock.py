from __future__ import annotations

import pytest

from qelos_integrator_fastapi import (
    QelosConfig,
    QelosMockProductionError,
    create_request_sdk,
    get_mock_origin,
    stop_mock_sidecars,
)
from qelos_integrator_fastapi import mock as mock_mod
from qelos_integrator_fastapi.proxy_target import resolve_qelos_proxy_target

_ENV_KEYS = (
    "QELOS_PROXY_TARGET", "QELOS_IP", "QELOS_API_IP", "QELOS_MOCK", "QELOS_MOCK_URL",
    "ENV", "APP_ENV", "PYTHON_ENV", "NODE_ENV", "FASTAPI_ENV", "DEBUG",
)

MOCK_ORIGIN = "http://127.0.0.1:4555"


class FakeSidecar:
    instances: list["FakeSidecar"] = []

    def __init__(self, directory=None, *, port=0, command=None, **_kw) -> None:
        self.directory = directory
        self.origin = None
        self.stopped = False
        FakeSidecar.instances.append(self)

    @property
    def running(self) -> bool:
        return self.origin is not None and not self.stopped

    def start(self) -> str:
        self.origin = MOCK_ORIGIN
        return self.origin

    def stop(self) -> None:
        self.stopped = True


@pytest.fixture(autouse=True)
def clean(monkeypatch: pytest.MonkeyPatch):
    for key in _ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    FakeSidecar.instances = []
    monkeypatch.setattr(mock_mod, "MockSidecar", FakeSidecar)
    yield
    stop_mock_sidecars()


def test_mock_off_keeps_regular_target() -> None:
    cfg = QelosConfig(app_url="https://real.example")
    assert resolve_qelos_proxy_target(cfg) == "https://real.example"
    assert FakeSidecar.instances == []


def test_config_mock_switches_proxy_target_and_sdk() -> None:
    cfg = QelosConfig(app_url="https://real.example", mock=True)
    assert resolve_qelos_proxy_target(cfg) == MOCK_ORIGIN
    sdk = create_request_sdk(cfg, request=None)  # type: ignore[arg-type]
    assert sdk._app_url == MOCK_ORIGIN
    assert len(FakeSidecar.instances) == 1  # sidecar is shared, started once


def test_env_mock_path_is_passed_as_directory(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_MOCK", "./mock-data")
    assert get_mock_origin(QelosConfig(app_url="x")) == MOCK_ORIGIN
    assert FakeSidecar.instances[0].directory == "./mock-data"


def test_env_mock_false_disables(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_MOCK", "0")
    assert get_mock_origin(QelosConfig(app_url="x")) is None


def test_config_false_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_MOCK", "1")
    assert get_mock_origin(QelosConfig(app_url="x", mock=False)) is None


def test_mock_url_skips_spawning(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QELOS_MOCK_URL", "http://127.0.0.1:9999/")
    cfg = QelosConfig(app_url="https://real.example")
    assert resolve_qelos_proxy_target(cfg) == "http://127.0.0.1:9999"
    assert FakeSidecar.instances == []


@pytest.mark.parametrize(
    "key,value",
    [("ENV", "production"), ("NODE_ENV", "production"), ("APP_ENV", "prod"), ("DEBUG", "false")],
)
def test_production_guard(monkeypatch: pytest.MonkeyPatch, key: str, value: str) -> None:
    monkeypatch.setenv(key, value)
    monkeypatch.setenv("QELOS_MOCK", "1")
    with pytest.raises(QelosMockProductionError):
        resolve_qelos_proxy_target(QelosConfig(app_url="https://real.example"))
    with pytest.raises(QelosMockProductionError):
        get_mock_origin(QelosConfig(app_url="x", mock_url="http://127.0.0.1:1"))
    assert FakeSidecar.instances == []


def test_production_without_mock_is_untouched(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "production")
    cfg = QelosConfig(app_url="https://real.example")
    assert resolve_qelos_proxy_target(cfg) == "https://real.example"


def test_shutdown_stops_sidecar() -> None:
    cfg = QelosConfig(app_url="x", mock=True)
    get_mock_origin(cfg)
    sidecar = FakeSidecar.instances[0]
    stop_mock_sidecars()
    assert sidecar.stopped
    stop_mock_sidecars()  # idempotent


def test_lifespan_starts_and_stops() -> None:
    import asyncio

    from qelos_integrator_fastapi import qelos_mock_lifespan

    cfg = QelosConfig(app_url="x", mock=True)

    async def run() -> None:
        async with qelos_mock_lifespan(cfg)(None):
            assert len(FakeSidecar.instances) == 1
            assert not FakeSidecar.instances[0].stopped

    asyncio.run(run())
    assert FakeSidecar.instances[0].stopped


def test_lazy_start_inside_event_loop_is_refused() -> None:
    import asyncio

    cfg = QelosConfig(app_url="x", mock=True)

    async def run() -> None:
        with pytest.raises(mock_mod.QelosMockError, match="lifespan"):
            get_mock_origin(cfg)

    asyncio.run(run())
    assert FakeSidecar.instances == []


def test_startup_timeout_is_an_overall_deadline(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()
    import sys

    script = "import time\nwhile True:\n print('noise', flush=True)\n time.sleep(0.05)\n"
    sidecar = mock_mod.MockSidecar(command=[sys.executable, "-u", "-c", script], startup_timeout=1.0)
    monkeypatch.setattr(sidecar, "_build_command", lambda: [sys.executable, "-u", "-c", script])
    start = mock_mod.time.monotonic()
    with pytest.raises(mock_mod.QelosMockError, match="did not become ready"):
        sidecar.start()
    assert mock_mod.time.monotonic() - start < 5
    assert not sidecar.running


def test_missing_npx_gives_clear_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()  # use the real MockSidecar
    monkeypatch.setattr(mock_mod.shutil, "which", lambda _name: None)
    with pytest.raises(mock_mod.QelosMockError, match="npx"):
        mock_mod.MockSidecar()._build_command()


def test_sidecar_terminates_process(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()

    class Proc:
        terminated = False

        def poll(self):
            return None

        def terminate(self):
            self.terminated = True

        def wait(self, timeout=None):
            return 0

    monkeypatch.setattr(
        mock_mod.MockSidecar, "_signal_tree", staticmethod(lambda p, force: p.terminate())
    )
    sidecar = mock_mod.MockSidecar()
    proc = Proc()
    sidecar._process = proc  # type: ignore[assignment]
    sidecar.stop()
    assert proc.terminated and not sidecar.running
