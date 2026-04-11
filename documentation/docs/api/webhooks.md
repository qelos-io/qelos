---
title: Webhooks / Lambdas API
editLink: true
---
# Webhooks / Lambdas API

Endpoints for executing serverless functions (lambdas) and webhooks through Qelos integrations. Each integration is identified by its integration ID.

> **SDK equivalent:** [`sdk.lambdas`](/sdk/execute_lambdas)

## Execute (POST)

Execute a webhook or lambda function using POST.

```
POST /api/webhooks/{integrationId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The integration identifier |

### Request Body

Any valid JSON payload to pass to the function.

```json
{
  "action": "process",
  "data": { "key": "value" }
}
```

### Response

Returns the function's response. The shape depends on the lambda implementation.

> **SDK:** [`sdk.lambdas.post(integrationId, data)`](/sdk/execute_lambdas#post-request)

---

## Execute (GET)

Execute a webhook or lambda function using GET.

```
GET /api/webhooks/{integrationId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The integration identifier |

### Response

Returns the function's response.

> **SDK:** [`sdk.lambdas.get(integrationId, data)`](/sdk/execute_lambdas#get-request)

---

## Execute (PUT)

Execute a webhook or lambda function using PUT.

```
PUT /api/webhooks/{integrationId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The integration identifier |

### Request Body

Any valid JSON payload to pass to the function.

### Response

Returns the function's response.

> **SDK:** [`sdk.lambdas.put(integrationId, data)`](/sdk/execute_lambdas#put-request)

---

## Execute (DELETE)

Execute a webhook or lambda function using DELETE.

```
DELETE /api/webhooks/{integrationId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The integration identifier |

### Response

Returns the function's response.

> **SDK:** [`sdk.lambdas.delete(integrationId, data)`](/sdk/execute_lambdas#delete-request)
