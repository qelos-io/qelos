from __future__ import annotations

import re

_DOMAIN_SEGMENT = re.compile(r";\s*Domain\s*=\s*[^;]+", re.IGNORECASE)
_DOMAIN_REPLACE = re.compile(r"(;\s*Domain\s*=\s*)[^;]+", re.IGNORECASE)


def strip_port(host: str) -> str:
    if host.startswith("["):
        end = host.find("]")
        return host if end == -1 else host[1:end]
    colon = host.find(":")
    return host if colon == -1 else host[:colon]


def rewrite_set_cookie_domain(set_cookie: str, new_domain: str | None) -> str:
    """Rewrite the ``Domain=`` attribute of a single ``Set-Cookie`` header value.

    Semantics match ``integrators/nuxt/src/cookies.ts``.
    """
    if not _DOMAIN_SEGMENT.search(set_cookie):
        return set_cookie

    if new_domain is None or not str(new_domain).strip():
        return _DOMAIN_SEGMENT.sub("", set_cookie)

    stripped = strip_port(str(new_domain).strip())
    if not stripped:
        return _DOMAIN_SEGMENT.sub("", set_cookie)
    return _DOMAIN_REPLACE.sub(r"\1" + stripped, set_cookie, count=1)


def rewrite_set_cookie_domains(values: list[str], new_domain: str | None) -> list[str]:
    """Apply :func:`rewrite_set_cookie_domain` to each ``Set-Cookie`` value."""
    return [rewrite_set_cookie_domain(v, new_domain) for v in values]
