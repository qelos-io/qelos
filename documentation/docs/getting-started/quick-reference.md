# Quick Reference Guide

## Essential CLI Commands

### Project Setup
```bash
# Create new plugin
qelos-cli create plugin my-plugin

# Create new blueprint
qelos-cli create blueprint Product

# Generate CRUD with UI
qelos-cli generate crud Product --with-listing --with-forms

# Pull remote resources
qelos-cli pull

# Push changes
qelos-cli push
```

### Development Workflow
```bash
# Start dev environment
pnpm dev

# Create initial data
pnpm populate-db

# Build for production
pnpm build

# Run tests
pnpm test
```

## Common Code Patterns

### 1. Blueprint Definition
```typescript
// blueprints/product.ts
export const ProductBlueprint = {
  name: 'Product',
  fields: {
    name: { type: 'string', required: true },
    price: { type: 'number', min: 0 },
    category: { type: 'reference', to: 'Category' },
    isActive: { type: 'boolean', default: true }
  }
}
```

### 2. Vue Component with SDK
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useSDK } from '@qelos/sdk'

const sdk = useSDK()
const products = ref([])

onMounted(async () => {
  products.value = await sdk.blueprints.list('Product')
})
</script>

<template>
  <quick-table :data="products" />
</template>
```

### 3. Plugin Page Structure
```vue
<template>
  <page-container>
    <template #header>
      <page-title>Products</page-title>
      <el-button @click="createProduct">Add Product</el-button>
    </template>
    
    <data-table :data="products" />
    
    <create-dialog v-model="showDialog" />
  </page-container>
</template>
```

### 4. Configuration Patterns
```typescript
// config/features.ts
export const features = {
  userAuth: true,
  billing: {
    enabled: true,
    provider: 'stripe'
  },
  auditLog: true
}
```

### 5. Event Handling
```typescript
// Subscribe to events
import { subscribe } from '@qelos/pubsub'

subscribe('product:created', (product) => {
  console.log('New product:', product)
})

// Emit events
import { emit } from '@qelos/pubsub'

emit('product:updated', product)
```

## Component Quick Reference

### Form Components
```vue
<form-input v-model="value" label="Label" />
<form-select v-model="value" :options="options" />
<form-date-picker v-model="date" />
<form-switch v-model="isActive" />
```

### Display Components
```vue
<quick-table :data="data" :columns="columns" />
<data-card title="Title">
  <p>Content</p>
</data-card>
<stat-card :value="100" label="Total Users" />
```

### Layout Components
```vue
<page-container>
  <template #header>Header content</template>
  <template #sidebar>Sidebar content</template>
  Main content
</page-container>

<grid-layout :cols="{ xs: 1, md: 2, lg: 3 }">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</grid-layout>
```

## SDK Methods Cheat Sheet

### Blueprint Operations
```typescript
// Create
await sdk.blueprints.create('Product', data)

// Read
const products = await sdk.blueprints.list('Product')
const product = await sdk.blueprints.get('Product', id)

// Update
await sdk.blueprints.update('Product', id, data)

// Delete
await sdk.blueprints.delete('Product', id)
```

### User Management
```typescript
// Current user
const user = await sdk.auth.getCurrentUser()

// Workspace
const workspace = await sdk.workspaces.getCurrent()

// Permissions
const canEdit = await sdk.permissions.check('product:edit')
```

### AI Operations
```typescript
// Chat completion
const response = await sdk.ai.chat('Hello, AI!')

// Stream chat
await sdk.ai.streamChat('Hello!', (chunk) => {
  console.log(chunk)
})
```

## Common CSS Variables
```css
/* Colors */
--qelos-primary: #409eff;
--qelos-success: #67c23a;
--qelos-warning: #e6a23c;
--qelos-danger: #f56c6c;

/* Spacing */
--qelos-spacing-xs: 4px;
--qelos-spacing-sm: 8px;
--qelos-spacing-md: 16px;
--qelos-spacing-lg: 24px;

/* Typography */
--qelos-font-size-base: 14px;
--qelos-font-size-lg: 16px;
--qelos-font-size-xl: 18px;
```

## Environment Variables
```bash
# Database
MONGODB_URL=mongodb://localhost:27017/qelos

# Redis
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Auth
JWT_SECRET=your_secret
```

## Debug Mode
```typescript
// Enable debug logging
window.QELOS_DEBUG = true

// Check current environment
console.log('Environment:', import.meta.env.MODE)
```

## Performance Tips
```typescript
// Use computed for derived data
const filteredProducts = computed(() => 
  products.value.filter(p => p.isActive)
)

// Lazy load components
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
)

// Batch API calls
await Promise.all([
  sdk.blueprints.list('Product'),
  sdk.blueprints.list('Category'),
  sdk.blueprints.list('User')
])
```
