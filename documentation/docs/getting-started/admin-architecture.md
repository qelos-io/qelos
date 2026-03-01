# Admin Interface Architecture

## Dependency Injection System

The Qelos admin interface provides several global dependencies that are injected and can be accessed throughout your application using Vue's `inject()` function.

### Available Dependencies

The following data are provided at the root level of the application:

```typescript
// User information
const user = inject('user') // Ref<User | null>

// Application configuration
const appConfig = inject('appConfig') // Ref<AppConfig>

// Workspace configuration
const wsConfig = inject('wsConfig') // Ref<WorkspaceConfig>
```

### Usage Example

```vue
<script setup>
import { inject } from 'vue'

// Access injected dependencies
const user = inject('user')
const appConfig = inject('appConfig')
const wsConfig = inject('wsConfig')

// Use the reactive data
watchEffect(() => {
  console.log('Current user:', user.value)
  console.log('App config:', appConfig.value)
})
</script>
```

## Component Override System

The admin interface supports overriding default layout components (Header and Navigation) with custom implementations.

### Override Components

If your application provides these components, they will replace the default ones:

- **RootHeader**: Custom header component
- **RootNavigation**: Custom navigation component

### Header Component

When providing a custom header component, it will receive these props:

```vue
<template>
  <CustomHeader
    @toggle="handleToggle"
    :is-navigation-opened="navigationOpened"
  />
</template>
```

**Props:**
- `is-navigation-opened`: Boolean indicating if the navigation drawer is open
- `@toggle`: Event to toggle the navigation drawer state

**Example Implementation:**
```vue
<script setup>
defineProps({
  isNavigationOpened: Boolean
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <div class="custom-header">
    <button @click="emit('toggle')">
      {{ isNavigationOpened ? 'Close' : 'Open' }} Menu
    </button>
  </div>
</template>
```

### Navigation Component

When providing a custom navigation component, it will receive these props:

```vue
<template>
  <CustomNavigation
    :opened="navigationOpened"
    @close="navigationOpened = false"
  />
</template>
```

**Props:**
- `opened`: Boolean controlling the visibility of the navigation drawer
- `@close`: Event to close the navigation drawer

**Example Implementation:**
```vue
<script setup>
defineProps({
  opened: Boolean
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="opened" class="custom-navigation">
    <button @click="emit('close')">×</button>
    <!-- Navigation content -->
  </div>
</template>
```

### Registering Custom Components

To register custom components, you need to provide them through the static components store. The system will automatically detect and use them if available.

The components are resolved in this order:
1. Custom component (if available)
2. Default Qelos component

This allows for seamless customization of the admin interface while maintaining fallback to the default implementation.
