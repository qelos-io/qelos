"""Dev mock mode: run ``@qelos/dev-mock`` as a Node sidecar and target it.

The mock Qelos API is a TypeScript package that cannot run in-process in
Python, so a small ``serve`` CLI is spawned (``npx @qelos/dev-mock serve``) and
the proxy / SDK / middleware simply use its origin as the Qelos origin.
"""

from __future__ import annotations

import asyncio
import atexit
import os
import queue
import shutil
import subprocess
import threading
from contextlib import asynccontextmanager
from typing import Dict, List, Mapping, Optional, Tuple

import httpx

from .config import QelosConfig

READY_PREFIX = "QELOS_MOCK_READY "
HEALTH_PATH = "/__qelos_mock__/health"
_PRODUCTION_VALUES = {"production", "prod"}
_ENV_KEYS = ("ENV", "APP_ENV", "PYTHON_ENV", "NODE_ENV", "FASTAPI_ENV")
_FALSY = {"0", "false", "no", "off"}


class QelosMockError(RuntimeError):
    """Raised when mock mode cannot be started."""


class QelosMockProductionError(QelosMockError):
    """Raised when mock mode is requested in a production environment."""


def assert_mock_allowed(env: Optional[Mapping[str, str]] = None) -> None:
    """Hard guard: refuse mock mode when the environment looks like production.

    Production is detected from ``ENV`` / ``APP_ENV`` / ``PYTHON_ENV`` /
    ``NODE_ENV`` / ``FASTAPI_ENV`` being ``production``/``prod``, or an
    explicit falsy ``DEBUG`` flag (``0``/``false``/...), which ASGI servers
    use to signal a non-debug run.
    """
    env = os.environ if env is None else env
    debug = env.get("DEBUG")
    if debug is not None and debug.strip().lower() in _FALSY:
        raise QelosMockProductionError(
            f"Qelos dev mock refuses to run when DEBUG={debug} (non-debug / production run)."
        )
    for key in _ENV_KEYS:
        if (env.get(key) or "").strip().lower() in _PRODUCTION_VALUES:
            raise QelosMockProductionError(
                f"Qelos dev mock refuses to run when {key}={env.get(key)}. "
                "Unset QELOS_MOCK / the `mock` config in production."
            )


def _mock_setting(config: QelosConfig, env: Mapping[str, str]) -> Tuple[bool, Optional[str]]:
    """Return ``(enabled, directory)`` from config (wins) or ``QELOS_MOCK``."""
    value = config.mock
    if value is None:
        raw = (env.get("QELOS_MOCK") or "").strip()
        if raw.lower() in _FALSY or not raw:
            return False, None
        value = True if raw.lower() in ("1", "true", "yes", "on") else raw
    if value is False:
        return False, None
    if value is True:
        return True, None
    return True, str(value)


def mock_url(config: QelosConfig, env: Optional[Mapping[str, str]] = None) -> Optional[str]:
    env = os.environ if env is None else env
    return (config.mock_url or env.get("QELOS_MOCK_URL") or "").strip().rstrip("/") or None


def is_mock_enabled(config: QelosConfig, env: Optional[Mapping[str, str]] = None) -> bool:
    env = os.environ if env is None else env
    if config.mock is False:
        return False
    return _mock_setting(config, env)[0] or bool(mock_url(config, env))


class MockSidecar:
    """A managed ``@qelos/dev-mock serve`` Node process."""

    def __init__(
        self,
        directory: Optional[str] = None,
        *,
        port: int = 0,
        command: Optional[List[str]] = None,
        startup_timeout: float = 30.0,
        env: Optional[Mapping[str, str]] = None,
    ) -> None:
        self.directory = directory
        self.port = port
        self.command = command
        self.startup_timeout = startup_timeout
        self._env = dict(os.environ if env is None else env)
        self._process: Optional[subprocess.Popen] = None
        self.origin: Optional[str] = None

    def _build_command(self) -> List[str]:
        if self.command:
            base = list(self.command)
        else:
            npx = shutil.which("npx")
            if not npx:
                raise QelosMockError(
                    "Qelos dev mock needs Node.js: `npx` was not found on PATH. "
                    "Install Node.js, or start the mock yourself "
                    "(`npx @qelos/dev-mock serve --dir <folder>`) and set QELOS_MOCK_URL."
                )
            base = [npx, "--yes", "@qelos/dev-mock"]
        args = base + ["serve", "--port", str(self.port), "--host", "127.0.0.1"]
        if self.directory:
            args += ["--dir", self.directory]
        return args

    @property
    def running(self) -> bool:
        return self._process is not None and self._process.poll() is None

    def start(self) -> str:
        if self.running and self.origin:
            return self.origin
        try:
            proc = subprocess.Popen(
                self._build_command(),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env={**self._env, "NODE_ENV": "development"},
            )
        except OSError as exc:
            raise QelosMockError(f"Failed to start the Qelos dev mock sidecar: {exc}") from exc
        self._process = proc

        lines: "queue.Queue[Optional[str]]" = queue.Queue()

        def _pump() -> None:
            assert proc.stdout is not None
            for line in proc.stdout:  # keeps draining so the pipe never fills
                lines.put(line.rstrip("\n"))
            lines.put(None)

        threading.Thread(target=_pump, daemon=True, name="qelos-mock-stdout").start()

        tail: List[str] = []
        try:
            while True:
                try:
                    line = lines.get(timeout=self.startup_timeout)
                except queue.Empty:
                    raise QelosMockError(
                        f"Qelos dev mock sidecar did not become ready within {self.startup_timeout}s"
                    ) from None
                if line is None:
                    raise QelosMockError(
                        "Qelos dev mock sidecar exited during startup:\n" + "\n".join(tail[-10:])
                    )
                if line.startswith(READY_PREFIX):
                    self.origin = line[len(READY_PREFIX):].strip().rstrip("/")
                    break
                tail.append(line)
            self._wait_healthy()
        except BaseException:
            self.stop()
            raise
        return self.origin

    def _wait_healthy(self) -> None:
        try:
            resp = httpx.get(f"{self.origin}{HEALTH_PATH}", timeout=5.0)
        except httpx.HTTPError as exc:
            raise QelosMockError(f"Qelos dev mock sidecar health check failed: {exc}") from exc
        if resp.status_code != 200:
            raise QelosMockError(f"Qelos dev mock sidecar health check returned {resp.status_code}")

    def stop(self) -> None:
        proc, self._process, self.origin = self._process, None, None
        if proc is None or proc.poll() is not None:
            return
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


_sidecars: Dict[Tuple[Optional[str], int], MockSidecar] = {}
_lock = threading.Lock()


def get_mock_origin(config: QelosConfig, env: Optional[Mapping[str, str]] = None) -> Optional[str]:
    """Origin of the mock Qelos API, or ``None`` when mock mode is off.

    Applies the production guard, then returns ``QELOS_MOCK_URL`` if set, else
    lazily starts (once per directory) the Node sidecar.
    """
    env = os.environ if env is None else env
    if not is_mock_enabled(config, env):
        return None
    assert_mock_allowed(env)
    url = mock_url(config, env)
    if url:
        return url
    _, directory = _mock_setting(config, env)
    key = (directory, config.mock_port)
    with _lock:
        sidecar = _sidecars.get(key)
        if sidecar is None or not sidecar.running:
            sidecar = MockSidecar(
                directory,
                port=config.mock_port,
                command=config.mock_command,
                env=env,
            )
            sidecar.start()
            _sidecars[key] = sidecar
        return sidecar.origin


def stop_mock_sidecars() -> None:
    """Terminate every sidecar started by this process (idempotent)."""
    with _lock:
        sidecars = list(_sidecars.values())
        _sidecars.clear()
    for sidecar in sidecars:
        sidecar.stop()


atexit.register(stop_mock_sidecars)


def qelos_mock_lifespan(config: QelosConfig):
    """FastAPI ``lifespan`` that starts the sidecar on startup and stops it on shutdown::

        app = FastAPI(lifespan=qelos_mock_lifespan(cfg))
    """

    @asynccontextmanager
    async def _lifespan(_app):
        if is_mock_enabled(config):
            await asyncio.get_running_loop().run_in_executor(None, get_mock_origin, config)
        try:
            yield
        finally:
            stop_mock_sidecars()

    return _lifespan
