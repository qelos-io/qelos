---
title: Generate Proxy Plugin
editLink: true
---
# Generate Proxy Plugin

The `generate proxy` command creates a proxy plugin configuration that allows Qelos to forward API requests from a local path to an external endpoint. This is useful for integrating external APIs into your Qelos application while maintaining a clean URL structure.

## Overview

Proxy plugins in Qelos enable you to:
- Forward requests from `/api/[path]` to external endpoints
- Add optional authentication tokens to proxied requests
- Maintain a consistent API structure within your application
- Hide external API complexities from your frontend code

## Usage

```bash
qelos generate proxy <pathFrom> <endpointTo> [--token]
```

### Arguments

- `<pathFrom>` - The local path for the proxy (without `/api/` prefix)
  - Example: `external`, `payments`, `analytics`
  - Qelos automatically prefixes with `/api/[path]`
  
- `<endpointTo>` - The external endpoint URL to proxy to
  - Must be a full URL including protocol
  - Example: `https://api.example.com`, `https://api.stripe.com`

### Options

- `--token` - Optional authentication token for the proxy
  - Can also be set using the `QELOS_PROXY_TOKEN` environment variable
  - Command line flag takes precedence over environment variable

## Examples

### Basic Proxy Without Authentication

```bash
qelos generate proxy external https://api.example.com
```

This creates a plugin that forwards requests from `/api/external` to `https://api.example.com`.

### Proxy with Command Line Token

```bash
qelos generate proxy payments https://api.stripe.com --token sk_test_123456789
```

This adds the authentication token to all proxied requests.

### Proxy with Environment Variable

```bash
export QELOS_PROXY_TOKEN=sk_test_123456789
qelos generate proxy payments https://api.stripe.com
```

The token is read from the environment variable.

## Generated Plugin Structure

The command generates a plugin file with the following structure:

```json
{
  "name": "external",
  "description": "external api",
  "manifestUrl": "",
  "apiPath": "external",
  "authAcquire": {
    "refreshTokenKey": "refresh_token",
    "accessTokenKey": "access_token"
  },
  "proxyUrl": "https://api.example.com",
  "subscribedEvents": [],
  "microFrontends": [],
  "injectables": [],
  "navBarGroups": [],
  "cruds": [],
  "token": "optional-token-if-provided"
}
```

### Fields Explained

- **name**: Generated from `pathFrom` by replacing `/` with `-`
- **apiPath**: The path used for routing (matches `<pathFrom>`)
- **proxyUrl**: The external endpoint where requests are forwarded
- **token**: Optional authentication token added to proxied requests
- **authAcquire**: Configuration for OAuth token handling (if needed)

## Request Flow

When a proxy plugin is active:

1. Client makes request to `/api/external/some/endpoint`
2. Qelos receives the request
3. Request is forwarded to `https://api.example.com/some/endpoint`
4. If a token is configured, it's added to the request headers
5. Response from external API is returned to the client

## Updating Existing Proxies

If a proxy plugin already exists, the command will:
- Update the `apiPath` and `proxyUrl` with new values
- Update the token only if a new token is provided (via flag or env)
- Preserve all other configuration (micro-frontends, cruds, etc.)

## Security Considerations

### Token Management

- **Command Line**: Tokens are visible in shell history
- **Environment Variable**: More secure, not visible in command history
- **Plugin File**: Tokens are stored in plain text in the plugin JSON file

### Best Practices

1. Use environment variables for production tokens
2. Rotate tokens regularly
3. Use separate tokens for different environments
4. Limit token permissions to only what's necessary

## Common Use Cases

### Payment Gateway Integration

```bash
qelos generate proxy payments https://api.stripe.com --token $STRIPE_SECRET_KEY
```

Frontend can now use `/api/payments/charges` instead of directly calling Stripe API.

### Third-party Analytics

```bash
qelos generate proxy analytics https://analytics.googleapi.com --token $GA_API_KEY
```

Analytics requests are proxied through Qelos, keeping API keys secure.

### Legacy API Integration

```bash
qelos generate proxy legacy https://legacy-api.company.com/v2
```

Modern frontend can interact with legacy APIs through a clean URL structure.

## Deployment

After generating the proxy plugin:

1. Review the generated plugin file in `plugins/[name].plugin.json`
2. Test the proxy locally
3. Push to Qelos:

```bash
qelos push plugins ./plugins/external.plugin.json
```

4. The proxy will be available at `/api/[path]` in your Qelos instance

## Troubleshooting

### Common Issues

1. **404 Errors**: Ensure the plugin has been pushed to Qelos
2. **Authentication Failures**: Verify the token is correct and has proper permissions
3. **CORS Issues**: The external API must allow requests from your Qelos domain
4. **Timeouts**: Large responses may timeout; consider increasing timeout values

### Debugging

Check the plugin configuration:
```bash
cat plugins/external.plugin.json
```

Verify the proxy is working:
```bash
curl -X GET "https://your-qelos-instance.com/api/external/health"
```

## Related Commands

- [`qelos push`](/cli/push) - Deploy the proxy plugin to Qelos
- [`qelos generate connection`](/cli/generate-connection) - Create secure connection configurations
- [`qelos generate agent`](/cli/generate-agent) - Generate AI agent integrations

## Related Resources

- [Plugin Development](/plugins/create) - Complete plugin development guide
- [API Gateway Configuration](/plugins/configuration) - Advanced proxy settings
- [Authentication in Plugins](/plugins/authentication) - OAuth and token management
