# Design System in Qelos

Qelos provides a comprehensive design system that allows you to customize every aspect of your application's appearance and behavior. This section covers how to leverage the design capabilities of Qelos.

## 🎨 Design Configuration

### Accessing Design Settings
The design configuration is available in the admin interface under Settings > Design. This allows you to:
- Customize colors and typography
- Configure navigation layout
- Set up branding elements
- Manage component overrides

### Programmatic Configuration
```typescript
// Access design configuration
const appConfig = inject('appConfig')

// Watch for changes
watch(() => appConfig.value.theme, (newTheme) => {
  // React to theme changes
})
```

## 🧩 Component System

### Global Components
Qelos provides a set of global components available throughout your application:

#### Form Components
```vue
<!-- Basic input with validation -->
<form-input v-model="value" label="Email" type="email" required />

<!-- Select with options -->
<form-select v-model="selected" :options="countries" label="Country" />

<!-- Date picker -->
<form-date-picker v-model="date" label="Birth Date" />

<!-- Toggle switch -->
<form-switch v-model="isActive" label="Active" />
```

#### Display Components
```vue
<!-- Data table with sorting -->
<quick-table 
  :data="products" 
  :columns="tableColumns"
  @sort="handleSort"
/>

<!-- Statistical cards -->
<stat-card :value="totalUsers" label="Total Users" trend="+12%" />
<stat-card :value="revenue" label="Revenue" format="currency" />

<!-- Data cards for grouping content -->
<data-card title="Product Details">
  <template #extra>
    <el-button @click="edit">Edit</el-button>
  </template>
  <p>Product content here</p>
</data-card>
```

#### Layout Components
```vue
<!-- Page structure -->
<page-container>
  <template #header>
    <page-title>Dashboard</page-title>
    <action-buttons @create="showCreateDialog" />
  </template>
  
  <template #sidebar>
    <navigation-menu :items="menuItems" />
  </template>
  
  <main-content>
    <!-- Your content -->
  </main-content>
</page-container>

<!-- Responsive grid -->
<grid-layout :cols="{ xs: 1, sm: 2, lg: 3 }" gap="20">
  <product-card v-for="product in products" :key="product.id" />
</grid-layout>
```

### Creating Custom Components

#### Component Structure
```vue
<!-- components/MyCustomComponent.vue -->
<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  title: String,
  data: Object
})

const emit = defineEmits(['update', 'delete'])
</script>

<template>
  <div class="my-custom-component">
    <h3>{{ title }}</h3>
    <!-- Component content -->
  </div>
</template>

<style scoped>
.my-custom-component {
  /* Use design tokens */
  background: var(--qelos-surface);
  border: 1px solid var(--qelos-border);
  padding: var(--qelos-spacing-md);
}
</style>
```

#### Registering Components
```typescript
// In your plugin or app
import { definePlugin } from '@qelos/plugin-play'

export default definePlugin({
  components: {
    'my-custom-component': MyCustomComponent
  }
})
```

## 🎯 Header and Navigation Customization

### Custom Header Component
Create a custom header to replace the default one:

```vue
<!-- components/CustomHeader.vue -->
<script setup>
defineProps({
  isNavigationOpened: Boolean
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <header class="custom-header">
    <div class="logo">
      <img src="/my-logo.png" alt="Logo" />
    </div>
    
    <div class="header-actions">
      <el-button @click="emit('toggle')">
        <menu-icon />
      </el-button>
    </div>
  </header>
</template>

<style scoped>
.custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--qelos-spacing-lg);
  height: var(--header-height);
  background: var(--qelos-primary);
  color: white;
}
</style>
```

### Custom Navigation Component
```vue
<!-- components/CustomNavigation.vue -->
<script setup>
defineProps({
  opened: Boolean
})

const emit = defineEmits(['close'])

const menuItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/products', icon: 'product', label: 'Products' },
  { path: '/settings', icon: 'settings', label: 'Settings' }
]
</script>

<template>
  <aside v-if="opened" class="custom-navigation">
    <div class="nav-header">
      <h3>Navigation</h3>
      <el-button @click="emit('close')" text>
        <close-icon />
      </el-button>
    </div>
    
    <nav-menu :items="menuItems" />
  </aside>
</template>
```

### Navigation Layout Options
Configure navigation layout through design settings:

```typescript
// Available layouts
const navigationLayouts = {
  'icon-text': 'Icon + Text (default)',
  'icon-above': 'Icon Above Text',
  'icons-only': 'Icons Only',
  'text-only': 'Text Only',
  'compact': 'Compact Mode'
}

// Apply layout
appConfig.value.navigationLayout = 'icons-only'
```

## 🔌 Plugin Design Integration

### Plugin Structure
```
my-plugin/
├── components/
│   ├── ProductCard.vue
│   └── ProductForm.vue
├── blocks/
│   ├── product-grid.block.html
│   └── product-detail.block.html
├── styles/
│   └── plugin.scss
└── plugin.ts
```

### Design Tokens in Plugins
```scss
// styles/plugin.scss
@use '@qelos/design-tokens' as tokens;

.my-plugin-component {
  background: tokens.$surface;
  color: tokens.$text-primary;
  border: 1px solid tokens.$border;
  padding: tokens.$spacing-md;
  
  &:hover {
    background: tokens.$surface-hover;
  }
}
```

### Plugin Components
```vue
<!-- components/ProductCard.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: Object,
  variant: {
    type: String,
    default: 'default' // default, compact, detailed
  }
})

const cardClass = computed(() => [
  'product-card',
  `product-card--${props.variant}`
])
</script>

<template>
  <div :class="cardClass">
    <div class="product-card__image">
      <img v-if="product.image" :src="product.image" :alt="product.name" />
      <div v-else class="placeholder">
        <image-icon />
      </div>
    </div>
    
    <div class="product-card__content">
      <h4 class="product-card__title">{{ product.name }}</h4>
      <p class="product-card__description">{{ product.description }}</p>
      <div class="product-card__price">{{ formatPrice(product.price) }}</div>
    </div>
  </div>
</template>
```

## 🌐 Using Global Components

### Available Global Components

#### AI Components
```vue
<!-- AI Chat interface -->
<ai-chat
  :thread-id="threadId"
  :tools="aiTools"
  @message-sent="handleMessage"
/>

<!-- AI-powered form completion -->
<ai-form-assist v-model="formData" blueprint="Product" />
```

#### Data Components
```vue
<!-- Monaco editor for code -->
<monaco-editor
  v-model="code"
  language="javascript"
  :options="editorOptions"
/>

<!-- Quick table for data display -->
<quick-table
  :data="tableData"
  :columns="columns"
  :pagination="true"
  @row-click="handleRowClick"
/>
```

#### Form Components
```vue
<!-- Enhanced form input -->
<form-input
  v-model="value"
  label="Email"
  :validation="emailValidation"
  :debounce="300"
/>

<!-- Rich text editor -->
<form-rich-text v-model="content" :toolbar="toolbar" />
```

### Component Composition
```vue
<!-- Building complex interfaces -->
<template>
  <page-container>
    <template #header>
      <page-title>Product Management</page-title>
      <el-button type="primary" @click="createProduct">
        <plus-icon /> Add Product
      </el-button>
    </template>
    
    <grid-layout :cols="{ xs: 1, lg: 3 }">
      <!-- Statistics -->
      <stat-card
        :value="totalProducts"
        label="Total Products"
        icon="product"
      />
      <stat-card
        :value="activeProducts"
        label="Active"
        trend="+5%"
      />
      <stat-card
        :value="revenue"
        label="Revenue"
        format="currency"
      />
    </grid-layout>
    
    <!-- Data Table -->
    <data-card title="Products">
      <template #extra>
        <el-input
          v-model="searchQuery"
          placeholder="Search products..."
          prefix-icon="search"
        />
      </template>
      
      <quick-table
        :data="filteredProducts"
        :columns="productColumns"
        :loading="loading"
      />
    </data-card>
  </page-container>
</template>
```

## 🎨 Design Best Practices

### 1. Use Design Tokens
```scss
/* Do */
.my-component {
  background: var(--qelos-surface);
  padding: var(--qelos-spacing-md);
}

/* Don't */
.my-component {
  background: #ffffff;
  padding: 16px;
}
```

### 2. Follow Component Conventions
- Use PascalCase for component names
- Provide clear props and emits
- Include scoped styles
- Make components composable

### 3. Responsive Design
```vue
<grid-layout :cols="{ xs: 1, sm: 2, lg: 3, xl: 4 }">
  <!-- Automatically adjusts based on screen size -->
</grid-layout>
```

### 4. Accessibility
```vue
<button
  @click="action"
  :aria-label="buttonLabel"
  :disabled="loading"
>
  <span v-if="loading" aria-hidden="true">Loading...</span>
  <span v-else>{{ buttonText }}</span>
</button>
```

## 🚀 Advanced Customization

### Theme Customization
```typescript
// Override theme colors
const customTheme = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  surface: '#ffffff',
  background: '#f8fafc'
}

// Apply theme
document.documentElement.style.setProperty('--qelos-primary', customTheme.primary)
```

### CSS Variables Reference
```css
/* Colors */
--qelos-primary: #409eff;
--qelos-success: #67c23a;
--qelos-warning: #e6a23c;
--qelos-danger: #f56c6c;
--qelos-info: #909399;

/* Surface Colors */
--qelos-surface: #ffffff;
--qelos-surface-hover: #f5f7fa;
--qelos-background: #f0f2f5;

/* Text Colors */
--qelos-text-primary: #303133;
--qelos-text-regular: #606266;
--qelos-text-secondary: #909399;
--qelos-text-placeholder: #c0c4cc;

/* Spacing */
--qelos-spacing-xs: 4px;
--qelos-spacing-sm: 8px;
--qelos-spacing-md: 16px;
--qelos-spacing-lg: 24px;
--qelos-spacing-xl: 32px;

/* Typography */
--qelos-font-family: 'Inter', sans-serif;
--qelos-font-size-xs: 12px;
--qelos-font-size-sm: 13px;
--qelos-font-size-base: 14px;
--qelos-font-size-lg: 16px;
--qelos-font-size-xl: 18px;
```

### Animation and Transitions
```vue
<script setup>
import { useTransition } from '@vueuse/core'

const animatedValue = useTransition(sourceValue, {
  duration: 300
})
</script>

<template>
  <div class="fade-enter-active">
    <!-- Content with transition -->
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

## 📚 Resources

- [Component Gallery](/pre-designed-frontends/components/) - Browse available components
- [Block Library](/pre-designed-frontends/blocks-list) - Pre-built layout blocks
- [Plugin Examples](/plugin-play/) - See design in action
- [Design Tokens](#design-tokens) - Complete token reference

This design system provides everything you need to create beautiful, consistent, and professional interfaces with Qelos.
