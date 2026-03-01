# Navigation Components

Qelos provides navigation components to help users move through your application with ease, including breadcrumbs, menus, and page titles.

## 🧭 breadcrumb

Navigation breadcrumb with custom separators and routing.

### Basic Breadcrumb

```vue
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const items = ref([
  { text: 'Home', path: '/' },
  { text: 'Products', path: '/products' },
  { text: 'Electronics', path: '/products/electronics' },
  { text: 'Laptops' }
])

const handleSelect = (item) => {
  if (item.path) {
    router.push(item.path)
  }
}
</script>

<template>
  <breadcrumb
    :items="items"
    separator="/"
    @select="handleSelect"
  />
</template>
```

### With Icons and Custom Separator

```vue
<script setup>
import { ref } from 'vue'

const breadcrumbItems = ref([
  { text: 'Home', icon: 'home', path: '/' },
  { text: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { text: 'Reports', icon: 'document', path: '/reports' },
  { text: 'Monthly Report' }
])

const customSeparator = '>'
</script>

<template>
  <div class="breadcrumb-demo">
    <!-- Default separator -->
    <breadcrumb
      :items="breadcrumbItems"
      @select="(item) => $router.push(item.path)"
    />
    
    <!-- Custom separator -->
    <breadcrumb
      :items="breadcrumbItems"
      :separator="customSeparator"
      style="margin-top: 20px"
    />
    
    <!-- Icon separator -->
    <breadcrumb
      :items="breadcrumbItems"
      separator-icon="arrow-right"
      style="margin-top: 20px"
    />
  </div>
</template>
```

### Dynamic Breadcrumb

```vue
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const pathArray = route.path.split('/').filter(p => p)
  const items = [{ text: 'Home', path: '/' }]
  
  let currentPath = ''
  pathArray.forEach((path, index) => {
    currentPath += `/${path}`
    const isLast = index === pathArray.length - 1
    
    items.push({
      text: formatBreadcrumbText(path),
      path: isLast ? null : currentPath
    })
  })
  
  return items
})

const formatBreadcrumbText = (text) => {
  return text
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<template>
  <breadcrumb
    :items="breadcrumbItems"
    separator="/"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | `[]` | Breadcrumb items |
| `separator` | `string` | `'/'` | Separator character |
| `separator-icon` | `string` | - | Icon name for separator |
| `home-icon` | `string` | `'home'` | Home icon name |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `item` | Item clicked |

## 📄 page-title

Page title with breadcrumb integration and actions.

### Basic Page Title

```vue
<script setup>
import { ref } from 'vue'

const title = ref('User Management')
const subtitle = ref('Manage application users and permissions')
</script>

<template>
  <page-title
    :title="title"
    :subtitle="subtitle"
  />
</template>
```

### With Breadcrumb and Actions

```vue
<script setup>
import { ref } from 'vue'

const pageTitle = ref('Product Catalog')
const breadcrumb = ref([
  { text: 'Home', to: '/' },
  { text: 'Products', to: '/products' },
  { text: 'Catalog' }
])

const actions = ref([
  {
    label: 'Import',
    icon: 'upload',
    action: () => console.log('Import clicked')
  },
  {
    label: 'Export',
    icon: 'download',
    action: () => console.log('Export clicked')
  },
  {
    label: 'Add Product',
    icon: 'plus',
    type: 'primary',
    action: () => console.log('Add product clicked')
  }
])

const handleAction = (action) => {
  action.action()
}
</script>

<template>
  <page-title
    :title="pageTitle"
    :breadcrumb="breadcrumb"
    :actions="actions"
    @action="handleAction"
  >
    <template #subtitle>
      Browse and manage your product inventory
      <el-tag size="small" style="margin-left: 8px">
        {{ products.length }} products
      </el-tag>
    </template>
  </page-title>
</template>
```

### With Custom Content

```vue
<script setup>
import { ref } from 'vue'

const title = ref('Analytics Dashboard')
const dateRange = ref([])

const handleDateChange = (dates) => {
  console.log('Date range changed:', dates)
}

const refreshData = () => {
  console.log('Refreshing data...')
}
</script>

<template>
  <page-title :title="title">
    <template #extra>
      <div class="title-extra">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          placeholder="Select range"
          size="small"
          @change="handleDateChange"
        />
        <el-button
          icon="refresh"
          size="small"
          circle
          @click="refreshData"
        />
      </div>
    </template>
    
    <template #default>
      <div class="title-content">
        <p>Real-time analytics and insights</p>
        <div class="quick-stats">
          <span>Views: 12,345</span>
          <span>Users: 1,234</span>
          <span>Revenue: $45,678</span>
        </div>
      </div>
    </template>
  </page-title>
</template>

<style scoped>
.title-extra {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-content p {
  margin: 0 0 10px 0;
  color: var(--qelos-text-secondary);
}

.quick-stats {
  display: flex;
  gap: 20px;
}

.quick-stats span {
  font-size: 14px;
  color: var(--qelos-text-regular);
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Page title |
| `subtitle` | `string` | - | Page subtitle |
| `breadcrumb` | `Array` | - | Breadcrumb items |
| `actions` | `Array` | - | Action buttons |
| `back-button` | `boolean` | `false` | Show back button |
| `back-to` | `string` | - | Back navigation path |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Custom content area |
| `subtitle` | Custom subtitle |
| `extra` | Extra content on the right |
| `actions` | Custom actions area |

## 📋 navigation-menu

Multi-level navigation menu with icons and badges.

### Basic Menu

```vue
<script setup>
import { ref } from 'vue'

const activeMenu = ref('dashboard')

const menuItems = ref([
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard'
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'users',
    path: '/users',
    badge: 5
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    path: '/settings'
  }
])

const handleMenuSelect = (item) => {
  activeMenu.value = item.id
  console.log('Selected:', item)
}
</script>

<template>
  <navigation-menu
    :items="menuItems"
    :active="activeMenu"
    @select="handleMenuSelect"
  />
</template>
```

### Multi-Level Menu

```vue
<script setup>
import { ref } from 'vue'

const expandedMenus = ref([])

const menuStructure = ref([
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard'
  },
  {
    id: 'products',
    label: 'Products',
    icon: 'product',
    children: [
      {
        id: 'product-list',
        label: 'All Products',
        path: '/products'
      },
      {
        id: 'categories',
        label: 'Categories',
        path: '/products/categories'
      },
      {
        id: 'inventory',
        label: 'Inventory',
        path: '/products/inventory',
        badge: 'Low'
      }
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'shopping-cart',
    children: [
      {
        id: 'orders',
        label: 'Orders',
        path: '/sales/orders',
        badge: 12
      },
      {
        id: 'customers',
        label: 'Customers',
        path: '/sales/customers'
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/sales/reports'
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    children: [
      {
        id: 'general',
        label: 'General',
        path: '/settings/general'
      },
      {
        id: 'users',
        label: 'User Management',
        path: '/settings/users'
      },
      {
        id: 'security',
        label: 'Security',
        path: '/settings/security'
      }
    ]
  }
])

const toggleMenu = (menuId) => {
  const index = expandedMenus.value.indexOf(menuId)
  if (index > -1) {
    expandedMenus.value.splice(index, 1)
  } else {
    expandedMenus.value.push(menuId)
  }
}

const isExpanded = (menuId) => {
  return expandedMenus.value.includes(menuId)
}
</script>

<template>
  <navigation-menu
    :items="menuStructure"
    :expanded="expandedMenus"
    @toggle="toggleMenu"
    @select="(item) => $router.push(item.path)"
  />
</template>
```

### Menu with Groups

```vue
<script setup>
import { ref } from 'vue'

const menuGroups = ref([
  {
    title: 'Main',
    items: [
      { id: 'home', label: 'Home', icon: 'home', path: '/' },
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard' }
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: 'users', path: '/users' },
      { id: 'products', label: 'Products', icon: 'product', path: '/products' },
      { id: 'orders', label: 'Orders', icon: 'order', path: '/orders', badge: 3 }
    ]
  },
  {
    title: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
      { id: 'logs', label: 'Logs', icon: 'document', path: '/logs' }
    ]
  }
])
</script>

<template>
  <div class="grouped-menu">
    <div v-for="group in menuGroups" :key="group.title" class="menu-group">
      <h4 class="group-title">{{ group.title }}</h4>
      <navigation-menu
        :items="group.items"
        :show-group-title="false"
        @select="(item) => $router.push(item.path)"
      />
    </div>
  </div>
</template>

<style scoped>
.grouped-menu {
  padding: 20px;
}

.menu-group {
  margin-bottom: 30px;
}

.group-title {
  margin: 0 0 10px 0;
  padding: 0 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--qelos-text-secondary);
  text-transform: uppercase;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | `[]` | Menu items |
| `active` | `string` | - | Active menu ID |
| `expanded` | `Array` | `[]` | Expanded menu IDs |
| `collapsible` | `boolean` | `true` | Menu can collapse |
| `show-group-title` | `boolean` | `true` | Show group titles |
| `icon-size` | `number` | `16` | Icon size |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `item` | Menu item selected |
| `toggle` | `menuId` | Menu toggled |

## 📑 tabs

Tab navigation with dynamic content and lazy loading.

### Basic Tabs

```vue
<script setup>
import { ref } from 'vue'

const activeTab = ref('first')
const tabs = ref([
  { name: 'first', label: 'Tab 1' },
  { name: 'second', label: 'Tab 2' },
  { name: 'third', label: 'Tab 3', disabled: true }
])

const handleTabChange = (tabName) => {
  console.log('Tab changed to:', tabName)
}
</script>

<template>
  <div class="tabs-demo">
    <tabs
      v-model="activeTab"
      :tabs="tabs"
      @change="handleTabChange"
    />
    
    <div class="tab-content">
      <div v-if="activeTab === 'first'">
        <h3>Content for Tab 1</h3>
        <p>This is the content of the first tab.</p>
      </div>
      
      <div v-if="activeTab === 'second'">
        <h3>Content for Tab 2</h3>
        <p>This is the content of the second tab.</p>
      </div>
    </div>
  </div>
</template>
```

### Tabs with Icons and Badges

```vue
<script setup>
import { ref } from 'vue'

const currentTab = ref('overview')
const notificationCount = ref(5)

const tabItems = ref([
  {
    name: 'overview',
    label: 'Overview',
    icon: 'dashboard'
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: 'message',
    badge: notificationCount.value
  },
  {
    name: 'tasks',
    label: 'Tasks',
    icon: 'check'
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: 'settings'
  }
])
</script>

<template>
  <div class="icon-tabs">
    <tabs
      v-model="currentTab"
      :tabs="tabItems"
      type="card"
      @change="console.log('Tab:', $event)"
    />
    
    <div class="tab-panels">
      <keep-alive>
        <component :is="currentTab + '-panel'" />
      </keep-alive>
    </div>
  </div>
</template>
```

### Vertical Tabs

```vue
<script setup>
import { ref } from 'vue'

const activeTab = ref('profile')

const settingsTabs = ref([
  { name: 'profile', label: 'Profile', icon: 'user' },
  { name: 'account', label: 'Account', icon: 'key' },
  { name: 'notifications', label: 'Notifications', icon: 'bell' },
  { name: 'privacy', label: 'Privacy', icon: 'lock' },
  { name: 'security', label: 'Security', icon: 'shield' }
])
</script>

<template>
  <div class="vertical-tabs-container">
    <tabs
      v-model="activeTab"
      :tabs="settingsTabs"
      direction="vertical"
      style="width: 200px"
    />
    
    <div class="vertical-content">
      <div v-if="activeTab === 'profile'" class="settings-panel">
        <h3>Profile Settings</h3>
        <el-form label-width="120px">
          <el-form-item label="Name">
            <el-input />
          </el-form-item>
          <el-form-item label="Email">
            <el-input />
          </el-form-item>
        </el-form>
      </div>
      
      <!-- Other tab panels -->
    </div>
  </div>
</template>

<style scoped>
.vertical-tabs-container {
  display: flex;
  gap: 30px;
}

.vertical-content {
  flex: 1;
  padding: 20px;
  background: var(--qelos-surface);
  border-radius: 4px;
}

.settings-panel h3 {
  margin-top: 0;
  margin-bottom: 20px;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | - | Active tab name |
| `tabs` | `Array` | `[]` | Tab configuration |
| `type` | `string` | `'default'` | Tab type: default, card, border-card |
| `direction` | `string` | `'horizontal'` | Direction: horizontal, vertical |
| `closable` | `boolean` | `false` | Tabs can be closed |
| `addable` | `boolean` | `false` | Can add tabs |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `tabName` | Tab changed |
| `add` | - | Tab added |
| `remove` | `tabName` | Tab removed |

## 📚 Next Steps

- [Form Components](/getting-started/components/form-components) - Input components
- [Data Components](/getting-started/components/data-components) - Tables and grids
- [Display Components](/getting-started/components/display-components) - Cards and badges
