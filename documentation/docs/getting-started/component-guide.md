# Component Guide

This guide covers how to use and create components in Qelos, including global components, custom components, and best practices.

## 🧩 Global Components

Qelos provides a rich set of global components that you can use throughout your application. These components are automatically available and don't need to be imported.

### Form Components

#### Form Input
The most versatile input component with built-in validation.

```vue
<script setup>
const formData = ref({
  name: '',
  email: '',
  password: ''
})

const validation = {
  name: { required: true, minLength: 3 },
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 8 }
}
</script>

<template>
  <form-input
    v-model="formData.name"
    label="Full Name"
    placeholder="Enter your name"
    :validation="validation.name"
    :debounce="300"
  />
  
  <form-input
    v-model="formData.email"
    label="Email Address"
    type="email"
    :validation="validation.email"
    error-message="Please enter a valid email"
  />
  
  <form-input
    v-model="formData.password"
    label="Password"
    type="password"
    :validation="validation.password"
    show-password-toggle
  />
</template>
```

#### Form Select
Dropdown selection with search and multi-select capabilities.

```vue
<script setup>
const selectedCountry = ref('')
const selectedTags = ref([])

const countries = [
  { value: 'us', label: 'United States', code: '+1' },
  { value: 'uk', label: 'United Kingdom', code: '+44' },
  { value: 'fr', label: 'France', code: '+33' }
]

const tags = [
  { value: 'vue', label: 'Vue.js' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' }
]
</script>

<template>
  <!-- Single selection -->
  <form-select
    v-model="selectedCountry"
    :options="countries"
    label="Country"
    placeholder="Select a country"
    clearable
  />
  
  <!-- Multiple selection -->
  <form-select
    v-model="selectedTags"
    :options="tags"
    label="Technologies"
    placeholder="Select technologies"
    multiple
    :max-tags="5"
  />
</template>
```

#### Form Date Picker
Date selection with various modes and formats.

```vue
<script setup>
const birthDate = ref('')
const dateRange = ref([])
const dateTime = ref('')

const shortcuts = [
  {
    text: 'Today',
    value: new Date()
  },
  {
    text: 'Yesterday',
    value: () => {
      const date = new Date()
      date.setDate(date.getDate() - 1)
      return date
    }
  }
]
</script>

<template>
  <!-- Date only -->
  <form-date-picker
    v-model="birthDate"
    label="Birth Date"
    placeholder="Select date"
    :shortcuts="shortcuts"
    :disabled-date="disableFutureDates"
  />
  
  <!-- Date range -->
  <form-date-picker
    v-model="dateRange"
    label="Date Range"
    type="daterange"
    placeholder="Select range"
  />
  
  <!-- Date and time -->
  <form-date-picker
    v-model="dateTime"
    label="Appointment"
    type="datetime"
    placeholder="Select date and time"
  />
</template>
```

#### Form Switch
Toggle switch for boolean values.

```vue
<script setup>
const settings = ref({
  notifications: true,
  darkMode: false,
  autoSave: true
})
</script>

<template>
  <form-switch
    v-model="settings.notifications"
    label="Enable Notifications"
    description="Receive email notifications for important updates"
  />
  
  <form-switch
    v-model="settings.darkMode"
    label="Dark Mode"
    :disabled="!settings.premium"
  />
  
  <form-switch
    v-model="settings.autoSave"
    label="Auto Save"
    active-text="On"
    inactive-text="Off"
  />
</template>
```

### Display Components

#### Quick Table
Powerful data table with sorting, filtering, and pagination.

```vue
<script setup>
const tableData = ref([])
const loading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    width: '200px'
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true
  },
  {
    key: 'role',
    label: 'Role',
    filterable: true,
    filters: [
      { text: 'Admin', value: 'admin' },
      { text: 'User', value: 'user' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    component: 'status-badge'
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '120px',
    fixed: 'right'
  }
]

const handleSort = ({ prop, order }) => {
  // Handle sorting
  loadUsers()
}

const handleFilter = (filters) => {
  // Handle filtering
  loadUsers()
}

const handleRowClick = (row) => {
  // Navigate to user details
  router.push(`/users/${row.id}`)
}
</script>

<template>
  <quick-table
    :data="tableData"
    :columns="columns"
    :loading="loading"
    :pagination="pagination"
    stripe
    border
    @sort-change="handleSort"
    @filter-change="handleFilter"
    @row-click="handleRowClick"
  >
    <!-- Custom column slot -->
    <template #status="{ row }">
      <status-badge :status="row.status" />
    </template>
    
    <!-- Actions column -->
    <template #actions="{ row }">
      <el-button size="small" @click.stop="editUser(row)">
        Edit
      </el-button>
      <el-button size="small" type="danger" @click.stop="deleteUser(row)">
        Delete
      </el-button>
    </template>
  </quick-table>
</template>
```

#### Stat Card
Display key metrics with trends and icons.

```vue
<script setup>
const stats = ref([
  {
    title: 'Total Users',
    value: 12543,
    trend: '+12.5%',
    trendDirection: 'up',
    icon: 'users',
    color: 'primary'
  },
  {
    title: 'Revenue',
    value: 89345,
    format: 'currency',
    trend: '+8.2%',
    trendDirection: 'up',
    icon: 'dollar',
    color: 'success'
  },
  {
    title: 'Conversion Rate',
    value: 3.24,
    format: 'percentage',
    trend: '-2.1%',
    trendDirection: 'down',
    icon: 'chart',
    color: 'warning'
  }
])
</script>

<template>
  <grid-layout :cols="{ xs: 1, sm: 2, lg: 4 }" gap="20">
    <stat-card
      v-for="stat in stats"
      :key="stat.title"
      :title="stat.title"
      :value="stat.value"
      :format="stat.format"
      :trend="stat.trend"
      :trend-direction="stat.trendDirection"
      :icon="stat.icon"
      :color="stat.color"
    />
  </grid-layout>
</template>
```

#### Data Card
Container component for grouping related content.

```vue
<template>
  <data-card
    title="Product Details"
    :loading="loading"
    :border="true"
    :shadow="'hover'"
  >
    <!-- Header extra content -->
    <template #extra>
      <el-button-group>
        <el-button size="small" @click="editProduct">
          Edit
        </el-button>
        <el-button size="small" type="danger" @click="deleteProduct">
          Delete
        </el-button>
      </el-button-group>
    </template>
    
    <!-- Card content -->
    <div class="product-info">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="Name">
          {{ product.name }}
        </el-descriptions-item>
        <el-descriptions-item label="Price">
          {{ formatCurrency(product.price) }}
        </el-descriptions-item>
        <el-descriptions-item label="Category">
          {{ product.category }}
        </el-descriptions-item>
        <el-descriptions-item label="Status">
          <el-tag :type="product.status === 'active' ? 'success' : 'danger'">
            {{ product.status }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>
    
    <!-- Footer actions -->
    <template #footer>
      <el-button @click="viewAnalytics">View Analytics</el-button>
      <el-button type="primary">Export Data</el-button>
    </template>
  </data-card>
</template>
```

### Layout Components

#### Page Container
Main layout wrapper for pages.

```vue
<template>
  <page-container>
    <!-- Page header -->
    <template #header>
      <div class="page-header">
        <page-title :breadcrumb="breadcrumb">
          User Management
        </page-title>
        
        <div class="header-actions">
          <el-button @click="exportUsers">
            <export-icon /> Export
          </el-button>
          <el-button type="primary" @click="showCreateDialog = true">
            <plus-icon /> Add User
          </el-button>
        </div>
      </div>
    </template>
    
    <!-- Sidebar (optional) -->
    <template #sidebar>
      <filter-panel
        v-model="filters"
        :options="filterOptions"
        @apply="applyFilters"
      />
    </template>
    
    <!-- Main content -->
    <div class="page-content">
      <quick-table :data="users" :columns="columns" />
    </div>
  </page-container>
</template>
```

#### Grid Layout
Responsive grid system for layouts.

```vue
<script setup>
const gridCols = {
  xs: 1,  // Mobile: 1 column
  sm: 2,  // Small tablets: 2 columns
  md: 3,  // Tablets: 3 columns
  lg: 4,  // Desktop: 4 columns
  xl: 5   // Large desktop: 5 columns
}
</script>

<template>
  <!-- Equal columns -->
  <grid-layout :cols="gridCols" gap="20">
    <product-card v-for="product in products" :key="product.id" />
  </grid-layout>
  
  <!-- Custom column spans -->
  <grid-layout :cols="12" gap="20">
    <div :span="8">Main content (8/12)</div>
    <div :span="4">Sidebar (4/12)</div>
  </grid-layout>
  
  <!-- Masonry layout -->
  <grid-layout :cols="gridCols" gap="20" masonry>
    <div v-for="item in items" :key="item.id" :style="{ height: item.height + 'px' }">
      {{ item.content }}
    </div>
  </grid-layout>
</template>
```

## 🎨 Creating Custom Components

### Component Structure

```vue
<!-- components/MyComponent.vue -->
<script setup>
import { computed, ref } from 'vue'

// Props definition
const props = defineProps({
  // Basic props
  title: {
    type: String,
    required: true
  },
  
  // Prop with default
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  
  // Complex prop
  config: {
    type: Object,
    default: () => ({
      showHeader: true,
      bordered: false
    })
  }
})

// Emits definition
const emit = defineEmits([
  'update',      // For v-model
  'click',
  'custom-event'
])

// Local state
const isActive = ref(false)
const count = ref(0)

// Computed properties
const sizeClass = computed(() => `my-component--${props.size}`)
const hasHeader = computed(() => props.config.showHeader && props.title)

// Methods
const handleClick = () => {
  isActive.value = !isActive.value
  emit('click', { active: isActive.value })
}

const increment = () => {
  count.value++
  emit('update', count.value)
}

// Watchers
watch(count, (newVal) => {
  if (newVal > 10) {
    emit('custom-event', { count: newVal })
  }
})

// Lifecycle
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <div 
    :class="['my-component', sizeClass]"
    :class="{ 'is-active': isActive }"
    @click="handleClick"
  >
    <!-- Conditional header -->
    <header v-if="hasHeader" class="my-component__header">
      <h3>{{ title }}</h3>
      <slot name="header-extra" />
    </header>
    
    <!-- Default slot -->
    <main class="my-component__body">
      <slot>
        Default content when no slot provided
      </slot>
    </main>
    
    <!-- Named slots -->
    <footer v-if="$slots.footer" class="my-component__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.my-component {
  /* Use design tokens */
  background: var(--qelos-surface);
  border: 1px solid var(--qelos-border);
  border-radius: var(--qelos-border-radius);
  padding: var(--qelos-spacing-md);
  transition: all 0.3s ease;
}

.my-component:hover {
  border-color: var(--qelos-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.my-component.is-active {
  background: var(--qelos-primary-light);
  border-color: var(--qelos-primary);
}

/* Size modifiers */
.my-component--small {
  padding: var(--qelos-spacing-sm);
}

.my-component--large {
  padding: var(--qelos-spacing-lg);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .my-component {
    background: var(--qelos-surface-dark);
    border-color: var(--qelos-border-dark);
  }
}
</style>
```

### Advanced Component Patterns

#### Renderless Component
```vue
<!-- components/RenderlessList.vue -->
<script setup>
const props = defineProps({
  items: Array,
  filterKey: String
})

const filteredItems = computed(() => {
  if (!props.filterKey) return props.items
  return props.items.filter(item => 
    item.name.toLowerCase().includes(props.filterKey.toLowerCase())
  )
})

const slots = useSlots()
</script>

<template>
  <!-- Don't render anything, just provide data -->
  <slot 
    :items="filteredItems"
    :count="filteredItems.length"
  />
</template>

<!-- Usage -->
<renderless-list :items="users" filter-key="search">
  <template #default="{ items, count }">
    <div>
      <p>Found {{ count }} users</p>
      <user-list :users="items" />
    </div>
  </template>
</renderless-list>
```

#### Compound Component
```vue
<!-- components/CompoundCard.vue -->
<script setup>
import { provide, ref } from 'vue'

const props = defineProps({
  title: String,
  bordered: Boolean
)

const isExpanded = ref(false)
const cardId = Symbol('card')

provide('card', {
  id: cardId,
  title: props.title,
  isExpanded,
  toggle: () => isExpanded.value = !isExpanded.value
})
</script>

<template>
  <div class="compound-card" :class="{ bordered }">
    <slot />
  </div>
</template>

<!-- components/CompoundCardHeader.vue -->
<script setup>
import { inject } from 'vue'

const card = inject('card')
</script>

<template>
  <header class="compound-card__header" @click="card.toggle">
    <h3>{{ card.title }}</h3>
    <chevron-icon :class="{ 'is-expanded': card.isExpanded }" />
  </header>
</template>

<!-- Usage -->
<compound-card title="User Details">
  <compound-card-header />
  <div v-if="isExpanded" class="compound-card__body">
    User content here
  </div>
</compound-card>
```

## 🔌 Plugin Components

### Registering Components in Plugins

```typescript
// plugin.ts
import { definePlugin } from '@qelos/plugin-play'
import MyComponent from './components/MyComponent.vue'
import ProductCard from './components/ProductCard.vue'

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  
  // Register components globally
  components: {
    'my-component': MyComponent,
    'product-card': ProductCard
  },
  
  // Component-specific configuration
  config: {
    components: {
      'product-card': {
        defaultVariant: 'default',
        showPrice: true
      }
    }
  }
})
```

### Component Overrides

```typescript
// Override existing components
export default definePlugin({
  overrides: {
    // Override a global component
    'quick-table': CustomTable,
    
    // Override with conditional logic
    'form-input': {
      component: EnhancedFormInput,
      condition: () => user.value?.premium
    }
  }
})
```

## 🎯 Best Practices

### 1. Naming Conventions
- Use PascalCase for component names
- Be descriptive but concise
- Prefix with your plugin name if needed

```vue
<!-- Good -->
<ProductCard />
<UserAvatar />
<DatePicker />

<!-- Avoid -->
<PC />
<UA />
<DP />
```

### 2. Props Design
- Keep props simple and typed
- Provide sensible defaults
- Use validators for constraints

```typescript
// Good
const props = defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

// Avoid
const props = defineProps({
  s: String // Unclear what this means
})
```

### 3. Event Naming
- Use kebab-case for event names
- Be descriptive about what happened
- Include relevant data

```typescript
// Good
emit('user-selected', { userId: user.id, userName: user.name })
emit('form-submitted', formData)

// Avoid
emit('click') // Too generic
emit('data', stuff) // Unclear what data
```

### 4. Slot Design
- Provide default content when useful
- Use named slots for complex layouts
- Document slot props

```vue
<!-- Good -->
<slot name="header" :title="title" :subtitle="subtitle">
  <h2>{{ title }}</h2>
</slot>

<!-- Avoid -->
<slot /> <!-- No context provided -->
```

### 5. Styling
- Use CSS custom properties (design tokens)
- Scope styles to avoid conflicts
- Consider dark mode

```scss
.my-component {
  /* Use design tokens */
  background: var(--qelos-surface);
  color: var(--qelos-text-primary);
  
  /* Responsive */
  @media (max-width: 768px) {
    padding: var(--qelos-spacing-sm);
  }
  
  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    background: var(--qelos-surface-dark);
  }
}
```

## 📚 Component Library

### Available Components
- [Form Components](/getting-started/components/form-components) - Input, select, date picker, switch
- [Data Components](/getting-started/components/data-components) - Table, editor, grid
- [Display Components](/getting-started/components/display-components) - Card, badge, avatar
- [Layout Components](/getting-started/components/layout-components) - Container, grid, section
- [Navigation Components](/getting-started/components/navigation-components) - Breadcrumb, menu, tabs
- [Feedback Components](/getting-started/components/feedback-components) - Empty state, loading, toast
- [AI Components](/getting-started/components/ai-components) - Chat, form assist

### Component Playground
Visit the component playground to see interactive examples:
[https://playground.qelos.io](https://playground.qelos.io)

This component system provides everything you need to build consistent, accessible, and beautiful interfaces with Qelos.
