# Qelos API Kit

This code brings together all Qelos services

## Main Features

### Express

`api-kit` creates Express apps to make the development easier.

### Auth Middlewares

`api-kit` provides simple authentication middlewares from the authentication service, without having to worry about fetching.

### Internal Service Communication

`api-kit` provides `service()` and `callInternalService()` for service-to-service HTTP calls with built-in timeout and retry handling.

#### Timeout

All requests have a default timeout of 30 seconds. Configure globally via environment variable or per request:

```
INTERNAL_SERVICE_TIMEOUT=60000
```

```ts
contentService({ method: 'GET', url: '/api/data', timeout: 10000 })
```

Timeout errors are logged: `[api-kit] GET /api/data timed out after 10000ms`

#### Retry

Requests automatically retry up to 3 times on connection errors (ECONNREFUSED, ECONNRESET) with exponential backoff (200ms, 400ms, 800ms).

Configure globally:
```
INTERNAL_SERVICE_RETRIES=5
INTERNAL_SERVICE_RETRY_DELAY=500
```

Or per request:
```ts
contentService({ method: 'GET', url: '/api/data', retries: 5, retryDelay: 500 })
```

To disable retries:
```ts
contentService({ method: 'POST', url: '/api/events', retries: 0 })
```

#### Retrying on HTTP status codes

By default, retries only happen on connection errors. To also retry on specific HTTP status codes (e.g. for idempotent GET requests), pass `retryableStatusCodes`:

```ts
contentService({ method: 'GET', url: '/api/data', retryableStatusCodes: [502, 503, 504] })
```

This is opt-in because retrying non-idempotent requests (POST, PUT) on server errors could cause duplicate operations.
