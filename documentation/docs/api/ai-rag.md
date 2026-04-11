---
title: AI RAG API
editLink: true
---
# AI RAG API

Endpoints for managing vector storage used in Retrieval-Augmented Generation (RAG). These endpoints allow you to create vector stores, upload content for indexing, and manage stored data.

> **SDK equivalent:** [`sdk.ai.rag`](/sdk/ai_operations#rag-retrieval-augmented-generation-operations)

## Create Vector Storage

Create a new vector storage instance for a specific scope.

```
POST /api/ai/sources/{sourceId}/storage
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sourceId` | `string` | The AI source ID |

### Request Body

```json
{
  "integrationId": "integration-id",
  "scope": "thread",
  "subjectId": "thread-id",
  "expirationAfterDays": 30
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `integrationId` | `string` | Yes | The AI integration ID |
| `scope` | `string` | Yes | Storage scope: `thread`, `user`, `workspace`, or `tenant` |
| `subjectId` | `string` | No | The subject ID (e.g., thread ID, user ID) |
| `expirationAfterDays` | `number` | No | Auto-expire storage after N days |

### Response

```json
{
  "success": true,
  "message": "Vector store created",
  "vectorStore": {
    "_id": "vector-store-id",
    "scope": "thread",
    "subjectId": "thread-id",
    "externalId": "external-id",
    "expirationAfterDays": 30,
    "created": "2025-01-01T00:00:00.000Z"
  }
}
```

> **SDK:** [`sdk.ai.rag.createStorage(sourceId, data)`](/sdk/ai_operations#creating-vector-storage)

---

## Upload Content

Upload content to be indexed in a vector store for RAG retrieval.

```
POST /api/ai/sources/{sourceId}/storage/upload
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sourceId` | `string` | The AI source ID |

### Request Body

```json
{
  "integrationId": "integration-id",
  "content": "This is the documentation for our product...",
  "fileName": "product-docs.txt",
  "vectorStoreId": "vector-store-id",
  "metadata": {
    "type": "documentation",
    "version": "1.0"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `integrationId` | `string` | No | The AI integration ID |
| `content` | `string \| object` | Yes | Text or JSON content to index |
| `fileName` | `string` | No | Name for the uploaded content |
| `vectorStoreId` | `string` | No | Target vector store ID |
| `metadata` | `object` | No | Additional metadata for the content |

### Response

```json
{
  "success": true,
  "message": "Content uploaded",
  "fileId": "file-id",
  "vectorStoreId": "vector-store-id"
}
```

> **SDK:** [`sdk.ai.rag.uploadContent(sourceId, data)`](/sdk/ai_operations#uploading-content)

---

## Clear Storage

Remove files from a vector store.

```
POST /api/ai/sources/{sourceId}/storage/clear
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sourceId` | `string` | The AI source ID |

### Request Body

```json
{
  "integrationId": "integration-id",
  "vectorStoreId": "vector-store-id",
  "fileIds": ["file-id-1", "file-id-2"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `integrationId` | `string` | No | The AI integration ID |
| `vectorStoreId` | `string` | No | The vector store to clear |
| `fileIds` | `string[]` | No | Specific file IDs to remove. If omitted, clears all files. |

### Response

```json
{
  "success": true,
  "message": "Storage cleared",
  "clearedCount": 2,
  "vectorStoreId": "vector-store-id"
}
```

> **SDK:** [`sdk.ai.rag.clearStorage(sourceId, data)`](/sdk/ai_operations#managing-storage)
