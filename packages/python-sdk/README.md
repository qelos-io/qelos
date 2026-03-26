# qelos-sdk (Python)

Python SDK for the Qelos API. Equivalent to the JavaScript `@qelos/sdk` package.

## Installation

```bash
pip install qelos-sdk
```

## Quick Start

```python
import asyncio
from qelos_sdk import QelosSDK, QelosSDKOptions

async def main():
    sdk = QelosSDK(QelosSDKOptions(
        app_url="https://yourdomain.com",
        api_token="your-api-token",
    ))

    # Get current user
    user = await sdk.authentication.get_logged_in_user()
    print(user)

    await sdk.close()

asyncio.run(main())
```

## Usage

### Main SDK

```python
from qelos_sdk import QelosSDK, QelosSDKOptions

sdk = QelosSDK(QelosSDKOptions(
    app_url="https://yourdomain.com",
    api_token="your-api-token",
))
```

### Administrator SDK

```python
from qelos_sdk.administrator import QelosAdministratorSDK
from qelos_sdk import QelosSDKOptions

admin_sdk = QelosAdministratorSDK(QelosSDKOptions(
    app_url="https://yourdomain.com",
    api_token="admin-api-token",
))
```

### Context Manager

Both SDKs support async context managers for automatic cleanup:

```python
async with QelosSDK(QelosSDKOptions(app_url="https://yourdomain.com", api_token="token")) as sdk:
    user = await sdk.authentication.get_logged_in_user()
```

### Authentication

```python
# OAuth sign in (stores tokens automatically)
await sdk.authentication.oauth_signin({
    "username": "user@example.com",
    "password": "password",
})

# Sign up
await sdk.authentication.signup({
    "username": "newuser@example.com",
    "password": "password",
    "firstName": "John",
    "lastName": "Doe",
    "birthDate": "1990-01-01",
})

# API token sign in
user = await sdk.authentication.api_token_signin("your-api-token")

# Get current user
user = await sdk.authentication.get_logged_in_user()

# Update current user
await sdk.authentication.update_logged_in_user({"firstName": "Jane"})

# Manage API tokens
tokens = await sdk.authentication.list_api_tokens()
new_token = await sdk.authentication.create_api_token({
    "nickname": "my-token",
    "expiresAt": "2025-12-31T23:59:59Z",
})
await sdk.authentication.delete_api_token(token_id)
```

### Workspaces

```python
# List workspaces
workspaces = await sdk.workspaces.get_list()

# Get workspace
workspace = await sdk.workspaces.get_workspace("workspace-id")

# Create workspace
workspace = await sdk.workspaces.create({"name": "My Workspace"})

# Update workspace
workspace = await sdk.workspaces.update("workspace-id", {"name": "Updated Name"})

# Get members
members = await sdk.workspaces.get_members("workspace-id")

# Activate workspace
await sdk.workspaces.activate("workspace-id")

# Delete workspace
await sdk.workspaces.remove("workspace-id")
```

### Blueprints & Entities

```python
# List blueprints
blueprints = await sdk.blueprints.get_list()

# Get blueprint
blueprint = await sdk.blueprints.get_blueprint("my-blueprint")

# Work with entities
entities_sdk = sdk.blueprints.entities_of("my-blueprint")

# List entities
entities = await entities_sdk.get_list({"$limit": 50, "$sort": "-created"})

# Create entity
entity = await entities_sdk.create({"name": "New Entity", "status": "active"})

# Update entity
entity = await entities_sdk.update("entity-id", {"status": "inactive"})

# Get entity
entity = await entities_sdk.get_entity("entity-id")

# Delete entity
await entities_sdk.remove("entity-id")

# Charts and aggregations
count = await sdk.blueprints.get_count("my-blueprint")
pie = await sdk.blueprints.get_pie_chart("my-blueprint")
total = await sdk.blueprints.get_sum("my-blueprint", "amount", "category")
```

### AI

```python
# Threads
thread = await sdk.ai.threads.create({"integration": "integration-id"})
threads = await sdk.ai.threads.list({"integration": "integration-id"})
thread = await sdk.ai.threads.get_one("thread-id")
await sdk.ai.threads.delete("thread-id")

# Non-streaming chat
response = await sdk.ai.chat.chat("integration-id", {
    "messages": [{"role": "user", "content": "Hello!"}],
})
print(response["choices"][0]["message"]["content"])

# Chat in thread
response = await sdk.ai.chat.chat_in_thread("integration-id", "thread-id", {
    "messages": [{"role": "user", "content": "Hello!"}],
})

# Streaming chat
processor = await sdk.ai.chat.stream("integration-id", {
    "messages": [{"role": "user", "content": "Hello!"}],
})
async for chunk in processor:
    print(chunk)

# Or use manual processing
await processor.process_manually(lambda data: print(data))

# RAG - Vector storage
store = await sdk.ai.rag.create_storage("source-id", {
    "integrationId": "integration-id",
    "scope": "user",
})
await sdk.ai.rag.upload_content("source-id", {
    "content": "Your document content here...",
    "fileName": "doc.txt",
})
await sdk.ai.rag.clear_storage("source-id", {})
```

### Blocks

```python
blocks = await sdk.blocks.get_list()
block = await sdk.blocks.get_block("block-id")
block = await sdk.blocks.create({"name": "My Block", "content": "Hello"})
block = await sdk.blocks.update("block-id", {"content": "Updated"})
await sdk.blocks.remove("block-id")
```

### Invites

```python
invites = await sdk.invites.get_list()
await sdk.invites.accept_workspace("workspace-id")
await sdk.invites.decline_workspace("workspace-id")
```

### Webhooks / Lambdas

```python
result = await sdk.lambdas.execute("integration-id")
result = await sdk.lambdas.post("integration-id", {"key": "value"})
result = await sdk.lambdas.put("integration-id", {"key": "value"})
result = await sdk.lambdas.delete("integration-id")
```

### Payments

```python
plans = await sdk.payments.get_plans()
plan = await sdk.payments.get_plan("plan-id")
checkout = await sdk.payments.checkout({
    "planId": "plan-id",
    "billingCycle": "monthly",
})
subscription = await sdk.payments.get_my_subscription()
await sdk.payments.cancel_subscription("subscription-id")
invoices = await sdk.payments.get_invoices()
await sdk.payments.validate_coupon("DISCOUNT20")
```

### App Configuration

```python
config = await sdk.app_configurations.get_app_configuration()
config = await sdk.app_configurations.update({"theme": "dark"})
```

### Administrator SDK

The administrator SDK extends the main SDK with admin-only modules:

```python
from qelos_sdk.administrator import QelosAdministratorSDK
from qelos_sdk import QelosSDKOptions

admin_sdk = QelosAdministratorSDK(QelosSDKOptions(
    app_url="https://yourdomain.com",
    api_token="admin-token",
))

# User management
users = await admin_sdk.users.get_list()
user = await admin_sdk.users.get_user("user-id")
user = await admin_sdk.users.create({
    "username": "new@user.com",
    "email": "new@user.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"],
    "metadata": {},
})
await admin_sdk.users.update("user-id", {"firstName": "Jane"})
await admin_sdk.users.remove("user-id")

# Encrypted data
data = await admin_sdk.users.get_encrypted_data("user-id", "secret-key")
await admin_sdk.users.set_encrypted_data("user-id", "secret-key", {"secret": "value"})

# Roles
roles = await admin_sdk.roles.get_existing_roles()

# Blueprint management
blueprints = await admin_sdk.manage_blueprints.get_list()
bp = await admin_sdk.manage_blueprints.create({...})
await admin_sdk.manage_blueprints.update("key", {...})
await admin_sdk.manage_blueprints.remove("key")

# Events
events = await admin_sdk.events.get_list({"kind": "user", "page": 1})
await admin_sdk.events.dispatch({
    "source": "my-service",
    "kind": "info",
    "eventName": "user.created",
    "description": "A new user was created",
})

# Impersonation
admin_sdk.impersonate_user("user-id", "workspace-id")
# ... perform actions as that user ...
admin_sdk.clear_impersonation()

# Custom configurations
configs = await admin_sdk.manage_configurations.get_list("key")
config = await admin_sdk.manage_configurations.create({
    "key": "my-config",
    "public": True,
    "metadata": {"setting": "value"},
})

# Integration sources
sources = await admin_sdk.integration_sources.get_list({"kind": "openai"})

# Integrations
integrations = await admin_sdk.integrations.get_list({"active": True})

# Plugins
plugins = await admin_sdk.manage_plugins.get_list()

# Components
components = await admin_sdk.components.get_list()

# Drafts
drafts = await admin_sdk.drafts.get_list()

# Lambdas
lambdas = await admin_sdk.manage_lambdas.get_list("source-id")

# Admin workspaces
all_workspaces = await admin_sdk.admin_workspaces.get_list()

# Payment management
plans = await admin_sdk.manage_payments.get_plans()
await admin_sdk.manage_payments.create_plan({...})
subscriptions = await admin_sdk.manage_payments.get_subscriptions()
coupons = await admin_sdk.manage_payments.get_coupons()
```

## API Reference

### Module mapping (JS to Python)

| JavaScript (TypeScript) | Python |
|---|---|
| `new QelosSDK({appUrl, fetch})` | `QelosSDK(QelosSDKOptions(app_url=...))` |
| `sdk.appConfigurations` | `sdk.app_configurations` |
| `sdk.blueprints.entitiesOf(key)` | `sdk.blueprints.entities_of(key)` |
| `sdk.ai.chat.chatInThread(...)` | `sdk.ai.chat.chat_in_thread(...)` |
| `sdk.ai.chat.streamInThread(...)` | `sdk.ai.chat.stream_in_thread(...)` |
| `sdk.payments.getMySubscription()` | `sdk.payments.get_my_subscription()` |
| `new QelosAdministratorSDK(...)` | `QelosAdministratorSDK(...)` |
| `adminSdk.adminWorkspaces` | `admin_sdk.admin_workspaces` |
| `adminSdk.manageLambdas` | `admin_sdk.manage_lambdas` |
| `adminSdk.manageConfigurations` | `admin_sdk.manage_configurations` |
| `adminSdk.manageBlueprints` | `admin_sdk.manage_blueprints` |
| `adminSdk.managePlugins` | `admin_sdk.manage_plugins` |
| `adminSdk.managePayments` | `admin_sdk.manage_payments` |
| `adminSdk.integrationSources` | `admin_sdk.integration_sources` |
| `adminSdk.impersonateUser(...)` | `admin_sdk.impersonate_user(...)` |
| `adminSdk.clearImpersonation()` | `admin_sdk.clear_impersonation()` |

### Key differences from JS SDK

1. **Async/await**: All API methods are `async` and must be awaited.
2. **No `fetch` injection**: Uses `httpx` internally. No need to provide a fetch function.
3. **Snake case**: All method and property names use Python's `snake_case` convention.
4. **Dict-based**: Uses plain `dict` instead of TypeScript interfaces. Field names match the API (camelCase).
5. **Context manager**: Supports `async with` for automatic resource cleanup.

## Requirements

- Python 3.9+
- httpx >= 0.24.0
