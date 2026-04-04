---
title: Confirm Message
editLink: true
---

# Confirm Message

A confirmation dialog component that displays a customizable message with confirm and cancel actions.

## Usage

```html
<confirm-message 
  v-model="showDialog"
  message="Are you sure you want to delete this item?"
  @confirm="handleConfirm"
></confirm-message>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | boolean | Required | Controls dialog visibility (v-model) |
| message | string | 'Are you sure?' | The confirmation message to display |
| title | string | 'Confirm Action' | Dialog title |
| confirmText | string | 'Confirm' | Text for confirm button |
| cancelText | string | 'Cancel' | Text for cancel button |
| type | 'warning' \| 'danger' \| 'info' | 'warning' | Dialog type affects styling |
| confirmButtonType | 'primary' \| 'success' \| 'warning' \| 'danger' | 'primary' | Button type for confirm action |
| showIcon | boolean | true | Whether to show the type icon |
| asyncConfirm | boolean | false | Whether confirm action is async (shows loading) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| confirm | value | Emitted when confirm button is clicked. Passes the v-model value |
| update:modelValue | boolean | Emitted when dialog visibility changes |

## Features

- **Customizable Messages**: Flexible message and title configuration
- **Type Variants**: Different visual styles for warning, danger, or info confirmations
- **Async Support**: Built-in loading state for async confirm actions
- **Icon Display**: Optional icon based on dialog type

## Examples

### Basic Confirmation

```html
<script setup>
const showDialog = ref(false)

function deleteItem() {
  showDialog.value = true
}

function handleConfirm() {
  // Perform delete action
  console.log('Item deleted')
}
</script>

<template>
  <el-button @click="deleteItem" type="danger">
    Delete Item
  </el-button>
  
  <confirm-message 
    v-model="showDialog"
    message="This action cannot be undone. Are you sure?"
    type="danger"
    @confirm="handleConfirm"
  />
</template>
```

### Custom Text and Type

```html
<confirm-message 
  v-model="showConfirm"
  title="Publish Changes"
  message="Are you ready to publish these changes to all users?"
  confirm-text="Publish"
  cancel-text="Review Again"
  type="info"
  confirm-button-type="success"
  @confirm="publishChanges"
/>
```

### Async Confirmation

```html
<confirm-message 
  v-model="showSaveDialog"
  message="Save all unsaved changes?"
  :async-confirm="true"
  @confirm="saveChanges"
/>
```

### With Custom Content

```html
<confirm-message 
  v-model="showComplexConfirm"
  title="Import Data"
  type="warning"
  @confirm="importData"
>
  <template #default>
    <p>This will overwrite existing data.</p>
    <el-alert type="warning" :closable="false">
      Make sure you have a backup before proceeding.
    </el-alert>
  </template>
</confirm-message>
```

---

© Velocitech LTD. All rights reserved.
