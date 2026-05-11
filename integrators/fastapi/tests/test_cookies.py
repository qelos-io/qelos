from __future__ import annotations

from qelos_integrator_fastapi.cookies import rewrite_set_cookie_domain, rewrite_set_cookie_domains


def test_replaces_a_leading_dot_domain_value() -> None:
    inp = "sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure"
    assert (
        rewrite_set_cookie_domain(inp, "example.com")
        == "sid=abc; Path=/; Domain=example.com; HttpOnly; Secure"
    )


def test_replaces_a_wildcard_domain_value() -> None:
    inp = "sid=abc; Path=/; Domain=*.qelos.app; HttpOnly"
    assert rewrite_set_cookie_domain(inp, "example.com") == "sid=abc; Path=/; Domain=example.com; HttpOnly"


def test_returns_unchanged_when_no_domain_attribute() -> None:
    inp = "sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax"
    assert rewrite_set_cookie_domain(inp, "example.com") == inp


def test_strips_port_from_host_port_new_domain() -> None:
    inp = "sid=abc; Domain=.qelos.app; Path=/"
    assert rewrite_set_cookie_domain(inp, "localhost:3000") == "sid=abc; Domain=localhost; Path=/"


def test_preserves_attribute_order_across_replacement() -> None:
    inp = "sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
    assert (
        rewrite_set_cookie_domain(inp, "example.com")
        == "sid=abc; Path=/; Domain=example.com; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
    )


def test_preserves_expires_with_commas() -> None:
    inp = "sid=abc; Domain=.qelos.app; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/"
    assert (
        rewrite_set_cookie_domain(inp, "example.com")
        == "sid=abc; Domain=example.com; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/"
    )


def test_domain_name_case_insensitive_preserves_casing() -> None:
    inp = "sid=abc; domain=.qelos.app; Path=/"
    assert rewrite_set_cookie_domain(inp, "example.com") == "sid=abc; domain=example.com; Path=/"


def test_strips_domain_segment_when_new_domain_none() -> None:
    inp = "sid=abc; Path=/; Domain=.qelos.app; HttpOnly; Secure; SameSite=Lax"
    assert (
        rewrite_set_cookie_domain(inp, None)
        == "sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax"
    )


def test_strips_domain_segment_when_new_domain_empty_string() -> None:
    inp = "sid=abc; Domain=.qelos.app; Path=/"
    assert rewrite_set_cookie_domain(inp, "") == "sid=abc; Path=/"


def test_removes_domain_when_last_attribute() -> None:
    inp = "sid=abc; Path=/; Domain=.qelos.app"
    assert rewrite_set_cookie_domain(inp, None) == "sid=abc; Path=/"


def test_rewrite_set_cookie_domains_maps_each() -> None:
    values = [
        "a=1; Domain=.qelos.app; Path=/",
        "b=2; Path=/; HttpOnly",
        "c=3; Domain=*.qelos.app; Secure",
    ]
    assert rewrite_set_cookie_domains(values, "example.com") == [
        "a=1; Domain=example.com; Path=/",
        "b=2; Path=/; HttpOnly",
        "c=3; Domain=example.com; Secure",
    ]


def test_rewrite_set_cookie_domains_strips_domain_when_none() -> None:
    values = [
        "a=1; Domain=.qelos.app; Path=/",
        "b=2; Domain=*.qelos.app; HttpOnly",
    ]
    assert rewrite_set_cookie_domains(values, None) == [
        "a=1; Path=/",
        "b=2; HttpOnly",
    ]
