---
title: Remove Button
editLink: true
---

# Remove Button

A specialized button component for deletion actions with built-in confirmation and loading states.

## Usage

```html
<remove-button 
  @remove="handleRemove"
  :loading="isRemoving"
></remove-button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | 'primary' \| 'success' \| 'warning' \| 'danger' | 'danger' | Button type |
| size | 'small' \| 'default' \| 'large' | 'default' | Button size |
| loading | boolean | false | Loading state |
| disabled | boolean | false | Disabled state |
| icon | string | 'delete' | Icon to display |
| text | string | 'Remove' | Button text |
| confirmMessage | string | undefined | Custom confirmation message |
| showConfirmation | boolean | true | Whether to show confirmation dialog |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| remove | none | Emitted when removal is confirmed |
| click | none | Emitted on button click (before confirmation) |

## Features

- **Built-in Confirmation**: Optional confirmation dialog before removal
- **Loading States**: Integrated loading state for async operations
- **Customizable**: Flexible text, icon, and styling options
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Examples

### Basic Remove Button

```html
<script setup>
const isRemoving = ref(false)

async function handleRemove() {
  isRemoving.value = true
  try {
    await deleteItem(itemId)
    ElMessage.success('Item removed successfully')
  } finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <remove-button 
    @remove="handleRemove"
    :loading="isRemoving"
  />
</template>
```

### Custom Text and Icon

```html
<remove-button 
  text="Delete User"
  icon="user-delete"
  size="small"
  @remove="deleteUser"
/>
```

### Without Confirmation

```html
<remove-button 
  :show-confirmation="false"
  text="Clear Cache"
  type="warning"
  @remove="clearCache"
/>
```

### Custom Confirmation Message

```html
<remove-button 
  confirm-message="This will permanently delete the user and all associated data. Continue?"
  @remove="deleteUserPermanently"
/>
```

### In Table Actions

```html
<el-table-column label="Actions" width="120">
  <template #default="{ row }">
    <remove-button 
      size="small"
      @remove="() => removeRow(row.id)"
    />
  </template>
</el-table-column>
```

---

© Velocitech LTD. All rights reserved.
