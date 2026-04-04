---
title: Blueprint Entity Form
editLink: true
---

# Blueprint Entity Form

A specialized form component designed for creating and editing blueprint entities with dynamic field generation based on blueprint configuration.

## Usage

```html
<blueprint-entity-form 
  blueprint="products"
  :entity-id="productId"
  @saved="handleSaved"
  @cancelled="handleCancelled"
></blueprint-entity-form>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| blueprint | string | Required | The blueprint identifier |
| entityId | string | undefined | ID of the entity to edit (omit for create mode) |
| initialData | Record<string, any> | {} | Initial form data |
| loading | boolean | false | External loading state |
| readonly | boolean | false | Whether the form is in read-only mode |
| hideActions | boolean | false | Whether to hide action buttons |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| saved | entity | Emitted when entity is successfully saved |
| cancelled | none | Emitted when cancel button is clicked |
| error | error | Emitted when save operation fails |

## Features

- **Dynamic Fields**: Automatically generates form fields based on blueprint configuration
- **Create/Edit Modes**: Handles both creation and editing of entities
- **Validation**: Applies blueprint-defined validation rules
- **Relationships**: Supports relationship fields and nested entities
- **Custom Components**: Uses appropriate components for different field types

## Examples

### Create New Entity

```html
<script setup>
function handleSaved(entity) {
  ElMessage.success('Product created successfully!')
  router.push(`/products/${entity._id}`)
}
</script>

<template>
  <blueprint-entity-form 
    blueprint="products"
    @saved="handleSaved"
    @cancelled="() => router.push('/products')"
  />
</template>
```

### Edit Existing Entity

```html
<script setup>
const route = useRoute()
const productId = route.params.id

function handleSaved(entity) {
  ElMessage.success('Product updated successfully!')
}
</script>

<template>
  <blueprint-entity-form 
    blueprint="products"
    :entity-id="productId"
    @saved="handleSaved"
  />
</template>
```

### With Initial Data

```html
<script setup>
const initialProduct = {
  name: 'New Product',
  category: 'electronics',
  price: 99.99
}
</script>

<template>
  <blueprint-entity-form 
    blueprint="products"
    :initial-data="initialProduct"
    @saved="handleSaved"
  />
</template>
```

### Read-only Mode

```html
<blueprint-entity-form 
  blueprint="products"
  :entity-id="productId"
  readonly
  hide-actions
/>
```

---

© Velocitech LTD. All rights reserved.
