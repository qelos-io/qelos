from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from qelos_sdk import QelosSDK


@dataclass
class QelosRequestContext:
    """Per-request context attached to ``request.state.qelos``."""

    #: SDK instance bound to the current request's cookies.
    sdk: "QelosSDK"

    #: The authenticated user, or ``None`` for anonymous requests.
    user: Optional[Dict[str, Any]] = None

    #: The active workspace for the request, or ``None`` when none is
    #: active / the user is anonymous.
    workspace: Optional[Dict[str, Any]] = None

    #: All workspaces the user has access to.
    workspaces: List[Dict[str, Any]] = field(default_factory=list)
