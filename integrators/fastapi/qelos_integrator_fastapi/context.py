from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from qelos_sdk import QelosSDK

    from .config import QelosConfig


@dataclass
class TokenPair:
    """Access / refresh token pair for the current request.

    The middleware mutates this object in place when a token refresh occurs,
    so later code can read the latest pair through
    :attr:`QelosRequestContext.tokens`.
    """

    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


@dataclass
class ResolvedTokens:
    """Tokens emitted by a successful refresh.

    ``access_token`` is always present; ``refresh_token`` is only set when
    the refresh flow rotates the refresh token (i.e. the access-token
    refresh path, not the cookie-token path).
    """

    access_token: str
    refresh_token: Optional[str] = None


@dataclass
class QelosRequestContext:
    """Per-request context attached to ``request.state.qelos``."""

    #: SDK instance bound to the current request's tokens.
    sdk: "QelosSDK"

    #: Access / refresh tokens for the request. Mutated in place when the
    #: SDK transparently refreshes them.
    tokens: TokenPair

    #: The authenticated user, or ``None`` for anonymous requests.
    user: Optional[Dict[str, Any]] = None

    #: The active workspace for the request, or ``None`` when none is
    #: active / the user is anonymous.
    workspace: Optional[Dict[str, Any]] = None

    #: All workspaces the user has access to.
    workspaces: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class TokenRefreshContext:
    """Arguments for :data:`TokenRefreshHook`."""

    request: Any
    #: Buffers ``Set-Cookie`` until the real response exists — typically a
    #: :class:`CookieBuffer` while the ASGI stack is still resolving.
    response: Any
    config: "QelosConfig"
    old_tokens: TokenPair
    new_tokens: ResolvedTokens
    sdk: "QelosSDK"


TokenRefreshHook = Callable[[TokenRefreshContext], Awaitable[None]]
