# Design Products Faster with Qelos

This guide provides practical tips, common patterns, and best practices to accelerate your SaaS product development using Qelos.

## 🚀 Quick Start Principles

### 1. Start with Blueprints First
Before building any UI, define your data structure:
```bash
# Create a blueprint for your core entity
qelos-cli create blueprint Product
```

**Why?** Blueprints automatically generate:
- CRUD operations
- Database schemas
- API endpoints
- Basic UI components

### 2. Use Pre-Designed Components
Don't build from scratch. Leverage the component ecosystem:
```vue
<!-- Use pre-built form components -->
<form-input v-model="product.name" label="Product Name" />
<quick-table :data="products" />
```

### 3. Configure Before You Code
Many features can be enabled through configuration:
```typescript
// Enable features in app config
const appConfig = {
  features: {
    userRegistration: true,
    billing: true,
    auditLog: true
  }
}
```

## ⚡ Productivity Tips

### Visual Development Workflow

1. **Use the Visual Editor First**
   - Design your pages with the WYSIWYG editor
   - Export the design as Vue components
   - Customize only what's necessary

2. **Prototype with Blocks**
   - Combine pre-built blocks for rapid prototyping
   - Each block is a fully functional Vue component
   - Blocks can be nested and reused

3. **Hot Reload Everything**
   - All changes reflect immediately
   - No need to restart the dev server
   - Works for blueprints, components, and configurations

### Code Generation Patterns

1. **CLI-First Development**
   ```bash
   # Generate entire CRUD interfaces
   qelos-cli generate crud Product --with-listing --with-forms
   
   # Create plugin pages quickly
   qelos-cli create page product-management --template=crud
   ```

2. **Template-Based Development**
   ```bash
   # Start from proven templates
   qelos-cli create plugin --template=saas-starter
   ```

3. **Schema-Driven UI**
   ```typescript
   // Define once, generate everywhere
   const productSchema = {
     name: { type: 'string', required: true },
     price: { type: 'number', min: 0 },
     category: { type: 'reference', to: 'Category' }
   }
   // Automatically generates forms, tables, and validations
   ```

## 🎯 Common SaaS Patterns

### User Management Pattern
```typescript
// Enable built-in user management
const config = {
  auth: {
    registration: 'public', // or 'invite-only' or 'admin-only'
    roles: ['admin', 'user', 'moderator'],
    socialLogin: ['google', 'github']
  }
}
```

### Multi-Tenancy Pattern
```typescript
// Automatic workspace isolation
const workspace = inject('wsConfig')
// All API calls are automatically scoped to current workspace
```

### Audit Log Pattern
```typescript
// Enable with configuration
const features = {
  auditLog: {
    track: ['create', 'update', 'delete'],
    entities: ['Product', 'User', 'Order']
  }
}
```

### Billing Integration Pattern
```typescript
// Built-in billing hooks
onSubscriptionChange((event) => {
  if (event.status === 'active') {
    // Grant premium features
  }
})
```

## 🔧 Development Accelerators

### 1. Use the SDK Effectively
```typescript
// Batch operations for better performance
const sdk = useSDK()
await Promise.all([
  sdk.blueprints.create(schema1),
  sdk.blueprints.create(schema2),
  sdk.blueprints.create(schema3)
])
```

### 2. Leverage PubSub for Real-time Updates
```typescript
// Automatic UI updates
subscribe('product:updated', (product) => {
  // Update local state automatically
  const index = products.value.findIndex(p => p._id === product._id)
  products.value[index] = product
})
```

### 3. Component Composition
```vue
<!-- Build complex UI from simple parts -->
<template>
  <data-card>
    <template #header>
      <page-title :title="pageTitle" />
      <action-buttons @create="openCreateModal" />
    </template>
    <quick-table 
      :data="filteredData"
      :columns="tableColumns"
      @row-click="editItem"
    />
  </data-card>
</template>
```

## 📋 Rapid Development Checklist

### Phase 1: Foundation (Day 1)
- [ ] Define core blueprints
- [ ] Set up workspace configuration
- [ ] Enable required features in config
- [ ] Create basic plugin structure

### Phase 2: Core Features (Day 2-3)
- [ ] Generate CRUD for main entities
- [ ] Set up user roles and permissions
- [ ] Create navigation structure
- [ ] Implement basic workflows

### Phase 3: Polish (Day 4-5)
- [ ] Add custom branding
- [ ] Implement specific business logic
- [ ] Set up billing if needed
- [ ] Add notifications and emails

### Phase 4: Launch Prep (Day 6-7)
- [ ] Configure production settings
- [ ] Set up monitoring
- [ ] Test all workflows
- [ ] Deploy to staging

## 🎨 UI/UX Acceleration

### 1. Design System Integration
```vue
<!-- Use design tokens -->
<style scoped>
.my-component {
  color: var(--qelos-primary);
  background: var(--qelos-surface);
}
</style>
```

### 2. Responsive by Default
```vue
<!-- All components are mobile-first -->
<grid-layout :cols="{ xs: 1, sm: 2, lg: 3 }">
  <product-card v-for="product in products" />
</grid-layout>
```

### 3. Theme Customization
```typescript
// Override in one place
const theme = {
  primary: '#your-brand-color',
  fonts: {
    body: 'Inter, sans-serif'
  }
}
```

## 🔄 Iteration Patterns

### 1. Feature Flags
```typescript
// Ship features behind flags
const features = {
  newDashboard: process.env.FEATURE_DASHBOARD === 'true'
}
```

### 2. A/B Testing Ready
```typescript
// Built-in experiment support
<experiment name="new-checkout" variants={['A', 'B']}>
  <template #A>
    <old-checkout />
  </template>
  <template #B>
    <new-checkout />
  </template>
</experiment>
```

### 3. Progressive Enhancement
```typescript
// Start simple, add complexity
const productPage = {
  version: 1, // Increment for updates
  features: ['basic'], // Add features as needed
  premiumFeatures: ['analytics', 'export']
}
```

## 🚀 Performance Tips

### 1. Lazy Loading
```vue
<!-- Automatic code splitting -->
<template>
  <lazy-component v-if="showDetails" />
</template>
```

### 2. Caching Strategy
```typescript
// Built-in cache management
const cache = useCache()
const products = await cache.get('products', () => 
  sdk.products.list(), 
  { ttl: 300 } // 5 minutes
)
```

### 3. Optimistic Updates
```typescript
// Update UI immediately, sync in background
async function updateProduct(product) {
  // Optimistic update
  const index = products.value.findIndex(p => p._id === product._id)
  products.value[index] = { ...product }
  
  try {
    await sdk.products.update(product._id, product)
  } catch (error) {
    // Rollback on error
    products.value[index] = originalProduct
  }
}
```

## 🎯 Common Pitfalls to Avoid

### 1. Don't Over-Engineer
- Start with built-in features
- Customize only when necessary
- Use conventions over configurations

### 2. Don't Ignore the CLI
- The CLI generates optimized code
- Follows best practices automatically
- Saves hours of boilerplate writing

### 3. Don't Skip Configuration
- Many features are config-driven
- Configuration is faster than code
- Easier to maintain and update

### 4. Don't Reinvent Components
- 50+ pre-built components available
- All are accessible and themeable
- Include business logic (permissions, etc.)

## 📚 Next Steps

1. **Study the Examples**
   - Browse the plugin marketplace
   - Check open-source plugins
   - Learn from community patterns

2. **Join the Community**
   - Discord for real-time help
   - GitHub discussions for patterns
   - Blog posts for deep dives

3. **Experiment Freely**
   - Use the dev environment
   - Test ideas quickly
   - Iterate based on feedback

Remember: The goal is to ship value to users quickly. Qelos handles the boilerplate so you can focus on what makes your product unique.
