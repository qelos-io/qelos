from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union


@dataclass
class QelosSDKOptions:
    """Configuration options for the Qelos SDK."""

    app_url: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    api_token: Optional[str] = None
    get_access_token: Optional[Callable[[], Optional[str]]] = None
    extra_headers: Optional[Callable[[str, bool], Awaitable[Dict[str, str]]]] = None
    force_refresh: bool = False
    on_failed_refresh_token: Optional[Callable[[], Awaitable[None]]] = None
    extra_query_params: Optional[Callable[[], Dict[str, str]]] = None


@dataclass
class RequestExtra:
    """Extra options for HTTP requests."""

    headers: Optional[Dict[str, str]] = None
    query: Optional[Dict[str, str]] = None
    timeout: Optional[float] = None
