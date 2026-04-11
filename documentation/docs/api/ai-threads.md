---
title: AI Threads API
editLink: true
---
# AI Threads API

Endpoints for managing AI conversation threads. Threads maintain context across multiple chat interactions.

> **SDK equivalent:** [`sdk.ai.threads`](/sdk/ai_operations#thread-operations)

## Create Thread

Create a new conversation thread.

```
POST /api/ai/threads
```

### Request Body

```json
{
  "integration": "integration-id",
  "title": "Customer Support Chat"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `integration` | `string` | Yes | The AI integration ID |
| `title` | `string` | No | Human-readable title for the thread |

### Response

```json
{
  "_id": "thread-id",
  "integration": "integration-id",
  "title": "Customer Support Chat",
  "messages": [],
  "messageSummaries": [],
  "created": "2025-01-01T00:00:00.000Z",
  "user": "user-id",
  "workspace": "workspace-id"
}
```

> **SDK:** [`sdk.ai.threads.create(data)`](/sdk/ai_operations#creating-threads)

---

## Get Thread

Retrieve a specific thread by ID, including its full message history.

```
GET /api/ai/threads/{threadId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `threadId` | `string` | The thread ID |

### Response

```json
{
  "_id": "thread-id",
  "integration": "integration-id",
  "title": "Customer Support Chat",
  "messages": [
    { "role": "user", "content": "Hello!", "timestamp": "2025-01-01T00:00:00.000Z" },
    { "role": "assistant", "content": "Hi! How can I help?", "timestamp": "2025-01-01T00:00:01.000Z" }
  ],
  "messageSummaries": [],
  "created": "2025-01-01T00:00:00.000Z",
  "updated": "2025-01-01T00:00:01.000Z"
}
```

> **SDK:** [`sdk.ai.threads.getOne(threadId)`](/sdk/ai_operations#retrieving-threads)

---

## List Threads

Retrieve threads with optional filtering and pagination.

```
GET /api/ai/threads
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `integration` | `string` | Filter by integration ID |
| `limit` | `number` | Maximum number of threads to return |
| `page` | `number` | Page number for pagination |
| `sort` | `string` | Sort field (e.g., `-created` for newest first) |
| `user` | `string` | Filter by user ID |
| `workspace` | `string` | Filter by workspace ID |

### Response

```json
{
  "threads": [
    {
      "_id": "thread-id",
      "integration": "integration-id",
      "title": "Customer Support Chat",
      "messages": [],
      "created": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 42
}
```

> **SDK:** [`sdk.ai.threads.list(options)`](/sdk/ai_operations#listing-threads)

---

## Delete Thread

Delete a conversation thread and its messages.

```
DELETE /api/ai/threads/{threadId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `threadId` | `string` | The thread ID |

### Response

```json
{
  "success": true
}
```

> **SDK:** [`sdk.ai.threads.delete(threadId)`](/sdk/ai_operations#deleting-threads)
