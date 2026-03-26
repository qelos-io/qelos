from __future__ import annotations

import json
from typing import Any, Dict, Optional, Type, TypeVar
from urllib.parse import urlencode

import httpx

from .types import QelosSDKOptions, RequestExtra

T = TypeVar("T")

_ERRORS = {
    "EXTRA_HEADERS": "could not get extra headers",
    "FAILED_REFRESH_TOKEN": "could not handle failed refresh token",
    "UNABLE_TO_REFRESH_TOKEN": "could not able to refresh token",
}


class QelosAPIError(Exception):
    """Error raised when a Qelos API call fails."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message)
        self.details = details


class BaseSDK:
    """Base SDK class providing HTTP client functionality for all Qelos API calls."""

    def __init__(self, options: QelosSDKOptions) -> None:
        self._ql_options = options
        app_url = options.app_url
        if app_url.endswith("/"):
            app_url = app_url[:-1]
        self._app_url = app_url
        self._client = httpx.AsyncClient()

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    async def call_api(
        self,
        relative_url: str,
        *,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        body: Any = None,
        timeout: Optional[float] = None,
    ) -> httpx.Response:
        """Make a raw HTTP call with authentication headers."""
        headers = dict(headers or {})

        if self._ql_options.extra_headers:
            try:
                extra = await self._ql_options.extra_headers(relative_url, False)
                headers.update(extra)
            except Exception:
                raise QelosAPIError(_ERRORS["EXTRA_HEADERS"])

        return await self._client.request(
            method,
            self._app_url + relative_url,
            headers=headers,
            content=body,
            timeout=timeout,
        )

    async def _handle_failed_refresh_token(self) -> None:
        if self._ql_options.on_failed_refresh_token:
            try:
                await self._ql_options.on_failed_refresh_token()
            except Exception:
                raise QelosAPIError(_ERRORS["FAILED_REFRESH_TOKEN"])
        else:
            raise QelosAPIError(_ERRORS["UNABLE_TO_REFRESH_TOKEN"])

    @staticmethod
    def _parse_response(response: httpx.Response) -> Any:
        content_type = response.headers.get("content-type", "text")
        is_json = "json" in content_type

        if is_json:
            body = response.json()
        else:
            body = response.text

        if not response.is_success:
            if isinstance(body, str):
                raise QelosAPIError(body)
            message = (
                body.get("message")
                or (body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else None)
                or body.get("error_description")
                or body.get("error")
                or "Request failed"
            )
            raise QelosAPIError(message, details=body)

        return body

    async def call_json_api(
        self,
        relative_url: str,
        *,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        body: Any = None,
        timeout: Optional[float] = None,
    ) -> Any:
        """Make a JSON API call with response parsing and token refresh handling."""
        try:
            response = await self.call_api(
                relative_url, method=method, headers=headers, body=body, timeout=timeout
            )

            # Handle token refresh if needed
            if self._ql_options.force_refresh and 400 <= response.status_code < 500:
                refresh_headers: Dict[str, str] = {}
                if self._ql_options.extra_headers:
                    try:
                        refresh_headers = await self._ql_options.extra_headers(relative_url, True)
                    except Exception:
                        pass

                if not refresh_headers.get("authorization"):
                    await self._handle_failed_refresh_token()

                response = await self.call_api(
                    relative_url, method=method, headers=headers, body=body, timeout=timeout
                )

            return self._parse_response(response)

        except QelosAPIError as err:
            if str(err) == _ERRORS["EXTRA_HEADERS"]:
                await self._handle_failed_refresh_token()
                response = await self.call_api(
                    relative_url, method=method, headers=headers, body=body, timeout=timeout
                )
                return self._parse_response(response)
            raise

    def get_query_params(self, more_query: Optional[Dict[str, Any]] = None) -> str:
        """Build a query string from extra query params and additional params."""
        qs: Optional[Dict[str, Any]] = None
        if self._ql_options.extra_query_params:
            qs = {**self._ql_options.extra_query_params(), **(more_query or {})}
        else:
            qs = more_query

        if qs:
            # Filter out None values
            filtered = {k: str(v) for k, v in qs.items() if v is not None}
            if filtered:
                return "?" + urlencode(filtered)
        return ""

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
