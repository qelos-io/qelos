---
title: Copy To Clipboard Component
editLink: true
---
# Copy To Clipboard Component

## Overview

The `<copy-to-clipboard>` component provides an easy way to copy text to the clipboard. It displays a button that, when clicked, copies the specified content and shows a success message to the user.

## Usage

```html
<copy-to-clipboard text="Text to be copied"></copy-to-clipboard>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | String | '' | Text content to copy to clipboard |
| `buttonText` | String | 'Copy' | Text to display on the button |
| `buttonIcon` | String | 'el-icon-document-copy' | Icon to display on the button |
| `buttonType` | String | 'default' | Button type (primary, success, warning, info, danger) |
| `buttonSize` | String | 'small' | Button size (large, default, small, mini) |
| `successMessage` | String | 'Copied to clipboard!' | Message to display after successful copy |
| `placement` | String | 'top' | Tooltip placement (top, top-start, top-end, bottom, etc.) |
| `showSuccessMessage` | Boolean | true | Whether to show success message after copying |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `copy` | (text: string) | Emitted when text is successfully copied |
| `error` | (error: Error) | Emitted if copying fails |

## Examples

### Basic Usage

```html
<copy-to-clipboard text="API_KEY_12345"></copy-to-clipboard>
```

### Custom Button Text and Icon

```html
<copy-to-clipboard 
  text="https://example.com/shared/document/123" 
  button-text="Copy URL"
  button-icon="el-icon-link"
></copy-to-clipboard>
```

### Primary Button Style

```html
<copy-to-clipboard 
  text="npm install @qelos/sdk" 
  button-text="Copy Install Command"
  button-type="primary"
></copy-to-clipboard>
```

### Custom Success Message

```html
<copy-to-clipboard 
  text="user@example.com" 
  success-message="Email address copied!"
></copy-to-clipboard>
```

### With Dynamic Content

```html
<template>
  <div>
    <el-input v-model="apiKey" placeholder="Enter API Key" style="width: 300px;"></el-input>
    <copy-to-clipboard 
      :text="apiKey" 
      button-text="Copy" 
      :disabled="!apiKey"
    ></copy-to-clipboard>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const apiKey = ref('');
</script>
```

### Inside a Form

```html
<el-form>
  <el-form-item label="Invitation Link">
    <el-input v-model="invitationLink" readonly></el-input>
    <copy-to-clipboard 
      :text="invitationLink" 
      button-text="Copy Link"
      button-type="success"
      @copy="handleCopied"
    ></copy-to-clipboard>
  </el-form-item>
</el-form>
```

### Inside a Table

```html
<quick-table :data="secretKeys" :columns="[
  { prop: 'name', label: 'Name' },
  { prop: 'key', label: 'Secret Key' },
  { prop: 'actions', label: 'Actions' }
]">
  <template #key="{ row }">
    <span class="masked-key">{{ maskKey(row.key) }}</span>
    <copy-to-clipboard :text="row.key" button-size="mini"></copy-to-clipboard>
  </template>
</quick-table>
```

---

u00a9 Velocitech LTD. All rights reserved.
