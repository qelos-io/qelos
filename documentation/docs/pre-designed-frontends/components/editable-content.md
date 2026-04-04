---
title: Editable Content
editLink: true
---

# Editable Content

A component that allows content to be edited inline, switching between display and edit modes.

## Usage

```html
<editable-content 
  v-model="content"
  :edit-mode="isEditing"
  @save="handleSave"
  @cancel="handleCancel"
></editable-content>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | string | Required | Content value (v-model) |
| editMode | boolean | false | Whether to show in edit mode |
| type | 'text' \| 'textarea' \| 'rich-text' | 'text' | Editor type |
| placeholder | string | 'Click to edit' | Placeholder text in edit mode |
| readonly | boolean | false | Whether content is read-only |
| maxLength | number | undefined | Maximum character limit |
| showEditButton | boolean | true | Whether to show edit button |
| saveOnBlur | boolean | true | Whether to save when editor loses focus |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| save | value | Emitted when content is saved |
| cancel | none | Emitted when edit is cancelled |
| edit | none | Emitted when entering edit mode |
| update:modelValue | string | Emitted when content changes |

## Features

- **Inline Editing**: Seamlessly switch between display and edit modes
- **Multiple Types**: Support for text, textarea, and rich text editing
- **Auto-save**: Optional save on blur functionality
- **Validation**: Built-in character limit and validation
- **Accessibility**: Proper focus management and keyboard shortcuts

## Examples

### Basic Editable Text

```html
<script setup>
const title = ref('My Document Title')

function handleSave(newTitle) {
  ElMessage.success('Title updated!')
}
</script>

<template>
  <h2>
    <editable-content 
      v-model="title"
      type="text"
      @save="handleSave"
    />
  </h2>
</template>
```

### Textarea Editing

```html
<script setup>
const description = ref('This is a product description...')
</script>

<template>
  <editable-content 
    v-model="description"
    type="textarea"
    :rows="4"
    placeholder="Enter product description..."
    @save="updateDescription"
  />
</template>
```

### Rich Text Editing

```html
<editable-content 
  v-model="articleContent"
  type="rich-text"
  :edit-mode="editingArticle"
  @save="saveArticle"
  @cancel="cancelEdit"
>
  <template #display="{ content }">
    <div v-html="content" class="article-content"></div>
  </template>
</editable-content>
```

### With Character Limit

```html
<editable-content 
  v-model="tweet"
  type="textarea"
  :max-length="280"
  placeholder="What's happening?"
  @save="postTweet"
/>
```

### Read-only Mode

```html
<editable-content 
  v-model="staticContent"
  readonly
  :show-edit-button="false"
/>
```

### Custom Edit Button

```html
<editable-content 
  v-model="customContent"
  @edit="startEditing"
>
  <template #edit-button="{ onClick }">
    <el-button 
      size="small" 
      type="primary" 
      @click="onClick"
      icon="edit"
    >
      Customize
    </el-button>
  </template>
</editable-content>
```

---

© Velocitech LTD. All rights reserved.
