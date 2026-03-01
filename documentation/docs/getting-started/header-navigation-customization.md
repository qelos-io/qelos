# Header and Navigation Customization

Learn how to customize the header and navigation components in Qelos to match your brand and user experience requirements.

## Overview

Qelos allows you to completely override the default header and navigation components with your own custom implementations. This is done through the component override system.

## Component Override System

### Registering Custom Components

When you provide custom components with these names, they will automatically replace the defaults:

- `RootHeader` - Custom header component
- `RootNavigation` - Custom navigation component

### Header Component Props

Your custom header will receive these props:

```typescript
interface HeaderProps {
  isNavigationOpened: boolean
  onToggle: () => void
}
```

### Navigation Component Props

Your custom navigation will receive these props:

```typescript
interface NavigationProps {
  opened: boolean
  onClose: () => void
}
```

## Implementation Examples

### Custom Header with Branding

```vue
<!-- components/CustomHeader.vue -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  isNavigationOpened: Boolean
})

const emit = defineEmits(['toggle'])

const route = useRoute()
const pageTitle = computed(() => route.meta.title || 'Dashboard')
</script>

<template>
  <header class="custom-header">
    <!-- Left section -->
    <div class="header-left">
      <el-button
        class="menu-toggle"
        @click="emit('toggle')"
        :class="{ 'is-active': isNavigationOpened }"
      >
        <menu-icon />
      </el-button>
      
      <div class="brand">
        <img src="/logo.svg" alt="Logo" class="logo" />
        <span class="brand-name">MyApp</span>
      </div>
    </div>
    
    <!-- Center section -->
    <div class="header-center">
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>
    
    <!-- Right section -->
    <div class="header-right">
      <search-bar placeholder="Search..." />
      
      <notification-bell :count="unreadNotifications" />
      
      <user-dropdown :user="currentUser" />
    </div>
  </header>
</template>

<style scoped>
.custom-header {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  background: var(--qelos-surface);
  border-bottom: 1px solid var(--qelos-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  border: none;
  background: transparent;
  
  &.is-active {
    color: var(--qelos-primary);
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  height: 32px;
  width: auto;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--qelos-text-primary);
}

.header-center {
  justify-self: center;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: var(--qelos-text-regular);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-self: end;
}
</style>
```

### Custom Navigation with Menu Groups

```vue
<!-- components/CustomNavigation.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  opened: Boolean
})

const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()
const activeGroup = ref('main')

const menuGroups = {
  main: [
    {
      path: '/dashboard',
      icon: 'dashboard',
      label: 'Dashboard',
      badge: null
    },
    {
      path: '/products',
      icon: 'product',
      label: 'Products',
      badge: productsCount
    },
    {
      path: '/customers',
      icon: 'users',
      label: 'Customers',
      badge: null
    }
  ],
  analytics: [
    {
      path: '/analytics/overview',
      icon: 'chart',
      label: 'Overview'
    },
    {
      path: '/analytics/reports',
      icon: 'document',
      label: 'Reports'
    }
  ],
  settings: [
    {
      path: '/settings/general',
      icon: 'settings',
      label: 'General'
    },
    {
      path: '/settings/team',
      icon: 'team',
      label: 'Team'
    }
  ]
}

const currentPath = computed(() => route.path)

const navigateTo = (path) => {
  router.push(path)
  emit('close')
}

const isActive = (path) => {
  return currentPath.value === path || 
         currentPath.value.startsWith(path + '/')
}
</script>

<template>
  <aside v-if="opened" class="custom-navigation">
    <!-- Navigation Header -->
    <div class="nav-header">
      <h2>Navigation</h2>
      <el-button @click="emit('close')" text>
        <close-icon />
      </el-button>
    </div>
    
    <!-- Menu Groups -->
    <div class="nav-content">
      <div
        v-for="(items, group) in menuGroups"
        :key="group"
        class="nav-group"
      >
        <h3
          class="nav-group-title"
          @click="activeGroup = activeGroup === group ? null : group"
        >
          {{ formatGroupName(group) }}
          <chevron-icon
            :class="{ 'is-rotated': activeGroup === group }"
          />
        </h3>
        
        <transition name="slide-down">
          <div v-show="activeGroup === group" class="nav-items">
            <router-link
              v-for="item in items"
              :key="item.path"
              :to="item.path"
              class="nav-item"
              :class="{ 'is-active': isActive(item.path) }"
              @click="navigateTo(item.path)"
            >
              <component :is="item.icon + '-icon'" class="nav-icon" />
              <span class="nav-label">{{ item.label }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </router-link>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- Navigation Footer -->
    <div class="nav-footer">
      <div class="user-info">
        <avatar :src="user.avatar" :name="user.name" size="small" />
        <div class="user-details">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-role">{{ user.role }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.custom-navigation {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  width: 280px;
  background: var(--qelos-surface);
  border-right: 1px solid var(--qelos-border);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--qelos-border);
}

.nav-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.nav-group {
  margin-bottom: 8px;
}

.nav-group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 24px;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--qelos-text-secondary);
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    color: var(--qelos-text-primary);
  }
}

.nav-items {
  margin-top: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 24px;
  color: var(--qelos-text-regular);
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    background: var(--qelos-surface-hover);
    color: var(--qelos-primary);
  }
  
  &.is-active {
    background: var(--qelos-primary-light);
    color: var(--qelos-primary);
    border-right: 3px solid var(--qelos-primary);
  }
}

.nav-icon {
  margin-right: 12px;
  font-size: 18px;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  background: var(--qelos-danger);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.nav-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--qelos-border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--qelos-text-primary);
}

.user-role {
  font-size: 12px;
  color: var(--qelos-text-secondary);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
```

## Navigation Layout Options

Qelos provides built-in navigation layout configurations:

### Icon + Text (Default)
```typescript
appConfig.value.navigationLayout = 'icon-text'
```
- Icons and labels side by side
- Width: 240px

### Icon Above Text
```typescript
appConfig.value.navigationLayout = 'icon-above'
```
- Icons positioned above labels
- Width: 200px

### Icons Only
```typescript
appConfig.value.navigationLayout = 'icons-only'
```
- Shows only icons with tooltips
- Width: 80px (most space efficient)

### Text Only
```typescript
appConfig.value.navigationLayout = 'text-only'
```
- Shows only text labels
- Width: 220px

### Compact Mode
```typescript
appConfig.value.navigationLayout = 'compact'
```
- Smaller icons and text
- Width: 200px

## Responsive Navigation

### Mobile Navigation Pattern
```vue
<script setup>
const isMobile = computed(() => window.innerWidth < 768)
const showMobileNav = ref(false)

// Close navigation on route change
watch(route, () => {
  if (isMobile.value) {
    showMobileNav.value = false
  }
})
</script>

<template>
  <!-- Desktop Navigation -->
  <custom-navigation
    v-if="!isMobile"
    :opened="true"
  />
  
  <!-- Mobile Navigation -->
  <teleport to="body">
    <div
      v-if="isMobile && showMobileNav"
      class="mobile-nav-overlay"
      @click="showMobileNav = false"
    >
      <custom-navigation
        :opened="true"
        @close="showMobileNav = false"
      />
    </div>
  </teleport>
</template>

<style>
.mobile-nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

@media (max-width: 768px) {
  .custom-navigation {
    width: 100%;
    max-width: 300px;
  }
}
</style>
```

## Best Practices

1. **Consistent Branding**
   - Use your brand colors consistently
   - Maintain consistent spacing and typography
   - Keep logo proportions appropriate

2. **Accessibility**
   - Provide keyboard navigation
   - Use semantic HTML elements
   - Include ARIA labels where needed

3. **Performance**
   - Lazy load navigation items for large menus
   - Use Vue's built-in transitions
   - Avoid complex animations in navigation

4. **User Experience**
   - Show active states clearly
   - Provide visual feedback on hover
   - Include badges for notifications

## Integration with Authentication

```vue
<script setup>
import { inject } from 'vue'

const user = inject('user')
const appConfig = inject('appConfig')

// Show/hide items based on permissions
const canViewAnalytics = computed(() => 
  user.value?.permissions.includes('analytics:view')
)
</script>

<template>
  <nav-item
    v-if="canViewAnalytics"
    path="/analytics"
    icon="chart"
    label="Analytics"
  />
</template>
```

This customization system allows you to create a unique navigation experience while maintaining the functionality and accessibility standards of the Qelos platform.
