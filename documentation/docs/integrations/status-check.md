---
title: Connection Status Checks
---

# Connection Status Checks

Every integration source can be checked for connectivity: are the stored credentials actually valid, and can Qelos reach the provider right now? This does not send data or perform side effects (no emails, no payments, no function invocations) — it only verifies that the connection works.

## Supported kinds

| Kind | What is checked |
|---|---|
| `sumit` | `POST /billing/payments/list/` against the Sumit API with the stored Company ID / API key |
| `paypal` | OAuth2 client-credentials token exchange |
| `paddle` | `GET /products?page[size]=1` against the Paddle API |
| `dodopayments` | `GET /payments?page=1&limit=1` against the DodoPayments API |
| `http` | A request to `metadata.baseUrl` using the configured method/headers; any response under 500 counts as reachable |
| `openai` | `GET /models` against the configured (or default) OpenAI-compatible endpoint |
| `qelos` | Internal (self) connections are always reported as connected; external connections attempt a sign-in against `metadata.url` |
| `email` | An SMTP handshake (`transporter.verify()`) — no email is sent |
| `aws` | `ListFunctions` (max 1 result) against AWS Lambda in the configured region |
| `cloudflare` | `GET /accounts/{accountId}/workers/scripts` against the Cloudflare API |

Kinds not listed above (OAuth-redirect-only providers like Google/GitHub/LinkedIn/Facebook, and not-yet-implemented kinds like N8n/Supabase/ClaudeAI/Gemini) return `status: 'unsupported'` rather than an error.

## Admin UI

Open **Admin → Integrations → {connection}** and use the two buttons above the connection form:

- **Test connection** — checks the values currently in the form, including any edits you haven't saved yet.
- **Check connection** — checks the credentials already saved on the server, ignoring whatever is in the form. Only shown when editing an existing connection.

## API

```
POST /api/integration-sources/:sourceId/status
```
Body (all optional): `{ metadata?, authentication? }`. Any field you omit falls back to the value already stored on the source — so an empty body checks the connection exactly as saved.

```
POST /api/integration-sources/status
```
For connections that haven't been created yet. Body: `{ kind, metadata, authentication? }`.

Both return:

```typescript
{
  status: 'connected' | 'failed' | 'unsupported';
  message: string;
  kind: string;
  checkedAt: string; // ISO timestamp
  details?: Record<string, unknown>; // safe, secret-free provider snippets
}
```

## SDK

```typescript
// Check a saved connection using its stored credentials
const result = await qelos.administrator.integrationSources.checkStatus('sourceId');

// Check a saved connection, but override one field before saving it (e.g. a freshly-typed API key)
await qelos.administrator.integrationSources.checkStatus('sourceId', {
  authentication: { apiKey: 'new-key' },
});

// Check a connection that hasn't been created yet
await qelos.administrator.integrationSources.checkDraftStatus({
  kind: 'email',
  metadata: { smtp: 'smtp.example.com', username: 'bot@example.com', email: 'bot@example.com', pop3: 'pop3.example.com', senderName: 'Bot' },
  authentication: { password: 'secret' },
});
```

## Notes

- **AWS / Cloudflare metadata**: `region`/`accessKeyId` (AWS) and `accountId` (Cloudflare) are validated and persisted on source creation — required for the status check (and every other AWS/Cloudflare operation) to have anything to check.
- **External Qelos connections**: the sign-in check has no way to target a specific tenant on the remote instance (the `IQelosSource` type has no tenant field), so it authenticates against whichever tenant the remote host resolves by default. Internal (self) Qelos connections skip this entirely — they're always reported as connected.
- Details are sanitized before being returned: credentials, tokens, and secrets are stripped from the `details` object regardless of provider.

See also: [Trigger, Data Manipulation & Target Pipeline](./pipeline.md), [Payments Troubleshooting](../payments/troubleshooting.md), [Sumit Integration](../payments/sumit.md), [Lambda/Serverless Functions](../lambdas.md).
