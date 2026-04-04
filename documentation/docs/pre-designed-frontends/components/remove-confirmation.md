---
title: Remove Confirmation
editLink: true
---

# Remove Confirmation

A confirmation dialog component for delete actions that supports both CRUD operations and blueprint entities.

## Usage

```html
<remove-confirmation 
  target="crud" 
  resource="users"
  v-model="showDialog"
  @removed="handleRemoved"
></remove-confirmation>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| target | `'crud' \| 'blueprint'` | Required | The type of target to remove - either a CRUD resource or a blueprint entity |
| resource | string | Required | The resource identifier (e.g., 'users', 'products') |
| role | string | undefined | Optional role parameter. When set to 'admin', adds bypassAdmin query parameter |
| queryParams | Record<string, string> | undefined | Additional query parameters to include in the request |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| removed | none | Emitted when the item is successfully removed |
| update:modelValue | boolean | Emitted when the dialog visibility changes (v-model) |

## Features

- **Dual Target Support**: Can handle both CRUD operations and blueprint entity removals
- **Admin Bypass**: Automatically adds bypassAdmin parameter when role is 'admin'
- **Blueprint Requirements Reload**: Automatically reloads blueprint requirements after removing blueprint entities
- **Error Handling**: Gracefully handles removal errors without throwing

## Examples

### CRUD Resource Removal

```html
<template>
  <remove-confirmation
    target="crud"
    resource="users"
    v-model="confirmDialog"
    @removed="onUserRemoved"
  ></remove-confirmation>
  
  <el-button @click="confirmDialog = true" type="danger">
    Delete User
  </el-button>
</template>

<script setup>
const confirmDialog = ref(false)

function onUserRemoved() {
  // Refresh user list or navigate away
  confirmDialog = false
  ElMessage.success('User deleted successfully')
}
</script>
```

### Blueprint Entity Removal with Admin Role

```html
<template>
  <remove-confirmation
    target="blueprint"
    resource="products"
    role="admin"
    :query-params="{ category: 'electronics' }"
    v-model="showConfirm"
    @removed="onProductRemoved"
  ></remove-confirmation>
</template>

<script setup>
const showConfirm = ref(false)

function onProductRemoved() {
  // Handle post-removal logic
  showConfirm = false
  router.push('/products')
}
</script>
```

## Implementation Details

The component uses the `ConfirmMessage` component internally for the dialog UI. It leverages:
- `usePluginsMicroFrontends()` store for CRUD operations
- Qelos SDK for blueprint entity operations
- `useScreenRequirementsStore()` for blueprint requirements management

---

© Velocitech LTD. All rights reserved.
