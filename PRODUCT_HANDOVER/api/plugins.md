# Plugins & Integrations

Extend Qelos with third-party plugins, external service connections, and trigger-to-target workflows.

## What Users Can Do

- **Install plugins**: Register plugins with manifests, micro-frontends, OAuth, API proxies
- **Proxy to plugins**: Call plugin backends through tenant-scoped API paths
- **Connect services**: Store credentials for OpenAI, HTTP, email, social, payment providers
- **Build integrations**: Wire trigger sources to target sources with optional data manipulation
- **Manage serverless**: Deploy and invoke AWS Lambda or Cloudflare Workers functions

## Plugin Endpoints

### GET /api/plugins
List plugins; privileged users see full config, others see public metadata.

### POST /api/plugins
Register plugin; fetch manifest, store tokens, wire micro-frontends.

### GET /api/plugins/:pluginId
Retrieve plugin configuration.

### PUT /api/plugins/:pluginId
Update plugin settings, manifest, micro-frontends.

### DELETE /api/plugins/:pluginId
Remove plugin and associated resources.

### GET /api/plugins/:pluginId/frontends/:mfeId
Fetch micro-frontend definition for admin embedding.

### GET /api/plugins/:pluginId/callback
Complete plugin OAuth flow.

### ANY /api/:apiPath/*
Proxy authenticated requests to plugin backend.

## Integration Endpoints

### GET /api/integrations
List trigger-to-target workflows.

### POST /api/integrations
Create integration linking validated trigger to target source.

### GET /api/integrations/:integrationId
Retrieve integration; optional populated source details.

### PUT /api/integrations/:integrationId
Update active state, trigger, target, or data manipulation.

### DELETE /api/integrations/:integrationId
Remove integration.

## Integration Source Endpoints

### GET /api/integration-sources
List connected external services (credentials excluded).

### POST /api/integration-sources
Connect new service with encrypted authentication.

### GET /api/integration-sources/:sourceId
Retrieve source configuration.

### PUT /api/integration-sources/:sourceId
Update name, labels, metadata, rotate credentials.

### DELETE /api/integration-sources/:sourceId
Remove source and purge credentials.

## Supported Integration Kinds

OpenAI, Gemini, Claude, HTTP, Email, Google, GitHub, LinkedIn, Facebook, Paddle, PayPal, Sumit, DodoPayments, N8n, Supabase, AWS, Cloudflare Workers, Qelos internal

**DodoPayments target operations** (`DodoPaymentsTargetOperation`): `createPayment`, `getPayment`, `listPayments`, `createSubscription`, `getSubscription`, `updateSubscription`, `cancelSubscription`, `listSubscriptions`, `createProduct`, `getProduct`, `listProducts`, `createCustomer`, `getCustomer`, `listCustomers`

## Related

- [Events & webhooks](events-and-webhooks.md)
- [Plugins screen](../frontend/plugins/PRODUCT.md)
- [Integrations hub](../frontend/integrations/PRODUCT.md)
