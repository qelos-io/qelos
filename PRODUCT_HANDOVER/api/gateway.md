# Gateway & Routing

The single public entry point for Qelos that resolves tenants, authenticates callers, and routes traffic to backend services.

## What Users Can Do

- **Call one API host**: Apps and SDKs use a single URL; the gateway forwards to auth, content, assets, blueprints, drafts, plugins, AI, and payments
- **Use custom domains**: Each hostname maps to a tenant so many isolated apps share one gateway
- **Stay signed in**: Cookies, bearer tokens, and API keys are resolved before requests reach backends
- **Access the admin panel**: Browser requests receive the tenant-branded admin SPA
- **Impersonate (admins)**: Pass impersonation headers to act as another user, workspace, or tenant

## User Flow

1. Request arrives at gateway with Host header (and optional tenant/auth headers)
2. Gateway resolves tenant from hostname or explicit tenant header
3. For authenticated requests, gateway calls `/api/me` to hydrate user context
4. Request is proxied to the matching backend service
5. Non-API browser requests receive customized admin HTML with tenant scripts and branding

## Proxied API Paths

| Path prefix | Backend service |
|-------------|-----------------|
| `/api/signin`, `/api/signup`, `/api/token`, `/api/me`, `/api/users`, `/api/logout`, `/api/invites`, `/api/workspaces`, `/api/auth`, `/api/roles` | Auth |
| `/api/blocks`, `/api/configurations`, `/api/tenants-configurations` | Content |
| `/api/assets`, `/api/storage`, `/api/upload` | Assets |
| `/api/blueprints`, `/api/components`, `/api/static` | No-code |
| `/api/drafts` | Drafts |
| `/api/plugins`, `/api/on`, `/api/events`, `/api/integrations`, `/api/integration-sources`, `/api/data-manipulation`, `/api/lambdas`, `/api/webhooks` | Plugins |
| `/api/ai` | AI |
| `/api/plans`, `/api/subscriptions`, `/api/checkout`, `/api/invoices`, `/api/coupons`, `/api/payments` | Payments |

## Related

- [Authentication](auth.md)
- [Admin Frontend](../frontend/PRODUCT.md)
