---
title: Connections Command
editLink: true
---
# Connections Command

The `qelos connections` command inspects the integration source connections (Sumit, PayPal, OpenAI, Email, AWS, Cloudflare, HTTP, …) configured for your tenant, directly from the terminal.

## `qelos connections status`

Prints a table of every connection with its ID, name, kind, and live connection status.

```bash
qelos connections status
```

Example output:

```
Connections status

ID                        NAME              KIND      STATUS
------------------------  ----------------  --------  -----------
64f1c2b8e4b0a1a2b3c4d5e6  Production Sumit  sumit     connected
64f1c2b8e4b0a1a2b3c4d5e7  Support Inbox     email     connected
64f1c2b8e4b0a1a2b3c4d5e8  Legacy PayPal     paypal    failed
64f1c2b8e4b0a1a2b3c4d5e9  GitHub OAuth      github    unsupported

3/4 connected
```

Status is computed the same way as **Test connection** / **Check connection** in the admin panel — it uses each connection's already-saved credentials to make a real (side-effect-free) call to the provider. See [Connection Status Checks](/integrations/status-check) for exactly what's checked per kind, and which kinds return `unsupported`.

A connection that fails to check (e.g. missing credentials) is shown with an `error: <message>` status instead of aborting the whole table.

## Authentication

Like every other command, `qelos connections status` authenticates using your stored credentials, `QELOS_API_TOKEN`/`QELOS_USERNAME`+`QELOS_PASSWORD` environment variables, or a `--global` environment. See the [CLI Introduction](/cli/) for the full authentication precedence.

## Related

- [Connection Status Checks](/integrations/status-check) — what each provider kind checks, and the underlying API/SDK methods
- [Global Environments](/cli/global) — run this command against a registered project from any directory
