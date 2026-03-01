# Feedback Components

Qelos provides feedback components to inform users about system status, actions, and important events through visual and textual cues.

## 🚫 empty-state

Empty state illustration with call-to-action for when no data is available.

### Basic Empty State

```vue
<script setup>
import { ref } from 'vue'

const hasData = ref(false)
const data = ref([])
</script>

<template>
  <div class="empty-state-demo">
    <!-- Show empty state when no data -->
    <empty-state
      v-if="!hasData"
      image="/empty-illustration.svg"
      title="No data available"
      description="There's nothing to show here yet"
    >
      <el-button type="primary" @click="hasData = true">
        Load Sample Data
      </el-button>
    </empty-state>
    
    <!-- Show content when data exists -->
    <div v-else class="data-content">
      <data-card title="Data Loaded">
        <p>Your data has been loaded successfully!</p>
        <el-button @click="hasData = false">Show Empty State</el-button>
      </data-card>
    </div>
  </div>
</template>
```

### Custom Empty State

```vue
<script setup>
import { ref } from 'vue'

const searchQuery = ref('')
const searchResults = ref([])

const handleSearch = async () => {
  // Simulate search
  await new Promise(resolve => setTimeout(resolve, 500))
  searchResults.value = [] // No results
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}
</script>

<template>
  <div class="search-container">
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="Search for products..."
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">Search</el-button>
        </template>
      </el-input>
    </div>
    
    <!-- Empty state for no search results -->
    <empty-state
      v-if="searchQuery && searchResults.length === 0"
      image="/no-results.svg"
      title="No results found"
      :description="`No products match "${searchQuery}"`"
    >
      <template #actions>
        <el-button @click="clearSearch">Clear Search</el-button>
        <el-button type="primary">Browse All Products</el-button>
      </template>
    </empty-state>
    
    <!-- Results list -->
    <div v-else-if="searchResults.length > 0" class="results-list">
      <!-- Display results -->
    </div>
  </div>
</template>

<style scoped>
.search-container {
  max-width: 600px;
  margin: 0 auto;
}

.search-bar {
  margin-bottom: 30px;
}
</style>
```

### Error Empty State

```vue
<script setup>
import { ref } from 'vue'

const errorState = ref({
  hasError: false,
  message: 'Failed to load data',
  code: 'NETWORK_ERROR'
})

const retry = async () => {
  errorState.value.hasError = false
  try {
    // Retry loading data
    await loadData()
  } catch (error) {
    errorState.value.hasError = true
    errorState.value.message = error.message
  }
}
</script>

<template>
  <empty-state
    v-if="errorState.hasError"
    image="/error-illustration.svg"
    title="Oops! Something went wrong"
    :description="errorState.message"
  >
    <template #extra>
      <el-tag type="danger" size="small">
        Error code: {{ errorState.code }}
      </el-tag>
    </template>
    
    <template #actions>
      <el-button @click="retry" :loading="loading">
        Try Again
      </el-button>
      <el-button type="primary" @click="contactSupport">
        Contact Support
      </el-button>
    </template>
  </empty-state>
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `image` | `string` | - | Illustration image URL |
| `title` | `string` | `'No Data'` | Empty state title |
| `description` | `string` | - | Descriptive text |
| `icon` | `string` | - | Icon name (alternative to image) |
| `size` | `string` | `'medium'` | Size: small, medium, large |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Custom content area |
| `actions` | Action buttons |
| `extra` | Extra information |

## 📊 loading-bar

Progress bar for async operations with customizable styles and animations.

### Basic Loading Bar

```vue
<script setup>
import { ref } from 'vue'

const isLoading = ref(false)
const progress = ref(0)

const startLoading = () => {
  isLoading.value = true
  progress.value = 0
  
  const interval = setInterval(() => {
    progress.value += Math.random() * 30
    if (progress.value >= 100) {
      progress.value = 100
      clearInterval(interval)
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    }
  }, 200)
}
</script>

<template>
  <div class="loading-demo">
    <loading-bar
      :loading="isLoading"
      :progress="progress"
      height="3px"
    />
    
    <el-button @click="startLoading" :disabled="isLoading">
      Start Loading
    </el-button>
  </div>
</template>
```

### Multiple Loading Bars

```vue
<script setup>
import { ref } from 'vue'

const tasks = ref([
  { id: 1, name: 'Uploading files', loading: false, progress: 0 },
  { id: 2, name: 'Processing data', loading: false, progress: 0 },
  { id: 3, name: 'Generating report', loading: false, progress: 0 }
])

const runTask = async (task) => {
  task.loading = true
  task.progress = 0
  
  const interval = setInterval(() => {
    task.progress += Math.random() * 40
    if (task.progress >= 100) {
      task.progress = 100
      clearInterval(interval)
      setTimeout(() => {
        task.loading = false
      }, 500)
    }
  }, 300)
}

const runAllTasks = async () => {
  for (const task of tasks.value) {
    runTask(task)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}
</script>

<template>
  <div class="multi-loading">
    <div class="loading-header">
      <h3>Task Progress</h3>
      <el-button @click="runAllTasks" :disabled="tasks.some(t => t.loading)">
        Run All Tasks
      </el-button>
    </div>
    
    <div class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
      >
        <div class="task-info">
          <span>{{ task.name }}</span>
          <span v-if="task.loading">{{ Math.round(task.progress) }}%</span>
        </div>
        
        <loading-bar
          :loading="task.loading"
          :progress="task.progress"
          :color="task.progress === 100 ? '#67c23a' : '#409eff'"
          height="6px"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-loading {
  max-width: 500px;
  margin: 0 auto;
}

.loading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-item {
  padding: 15px;
  background: var(--qelos-surface);
  border-radius: 4px;
}

.task-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
</style>
```

### Page Loading Bar

```vue
<script setup>
import { ref, onMounted } from 'vue'

const pageLoading = ref(false)
const pageProgress = ref(0)

// Simulate page loading
onMounted(() => {
  pageLoading.value = true
  
  const interval = setInterval(() => {
    pageProgress.value += 10
    if (pageProgress.value >= 100) {
      clearInterval(interval)
      setTimeout(() => {
        pageLoading.value = false
      }, 300)
    }
  }, 100)
})
</script>

<template>
  <div class="page-container">
    <!-- Fixed top loading bar -->
    <loading-bar
      :loading="pageLoading"
      :progress="pageProgress"
      :fixed="true"
      :top="0"
      color="linear-gradient(90deg, #409eff, #67c23a)"
      height="3px"
    />
    
    <!-- Page content -->
    <div class="page-content">
      <h1>Page Title</h1>
      <p>Content loads while progress bar shows at top</p>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  position: relative;
  min-height: 100vh;
}

.page-content {
  padding: 20px;
  transition: opacity 0.3s;
}

.page-content:has(+ .loading-bar[loading="true"]) {
  opacity: 0.7;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Loading state |
| `progress` | `number` | `0` | Progress percentage (0-100) |
| `height` | `string/number` | `'2px'` | Bar height |
| `color` | `string` | `'#409eff'` | Bar color |
| `fixed` | `boolean` | `false` | Fixed position |
| `top` | `string/number` | `0` | Top position when fixed |
| `animated` | `boolean` | `true` | Enable animations |

## 🔔 toast-notification

Toast notifications for displaying brief, non-intrusive messages to users.

### Basic Toast

```vue
<script setup>
import { ref } from 'vue'

const showSuccess = () => {
  Toast.success('Operation completed successfully!')
}

const showError = () => {
  Toast.error('An error occurred. Please try again.')
}

const showWarning = () => {
  Toast.warning('Please review your input before submitting.')
}

const showInfo = () => {
  Toast.info('New updates are available.')
}
</script>

<template>
  <div class="toast-demo">
    <el-button @click="showSuccess">Success</el-button>
    <el-button @click="showError">Error</el-button>
    <el-button @click="showWarning">Warning</el-button>
    <el-button @click="showInfo">Info</el-button>
  </div>
</template>
```

### Custom Toast

```vue
<script setup>
import { ref } from 'vue'

const showCustomToast = () => {
  Toast({
    message: 'File uploaded successfully',
    type: 'success',
    duration: 5000,
    showClose: true,
    onClick: () => {
      console.log('Toast clicked')
    },
    action: {
      text: 'View',
      onClick: () => {
        console.log('View action clicked')
      }
    }
  })
}

const showProgressToast = () => {
  const toast = Toast({
    message: 'Uploading file...',
    duration: 0, // No auto close
    showProgress: true,
    progress: 0
  })
  
  // Simulate progress
  let progress = 0
  const interval = setInterval(() => {
    progress += 10
    toast.updateProgress(progress)
    
    if (progress >= 100) {
      clearInterval(interval)
      toast.close()
      Toast.success('Upload complete!')
    }
  }, 200)
}
</script>

<template>
  <div class="custom-toast-demo">
    <el-button @click="showCustomToast">Custom Toast</el-button>
    <el-button @click="showProgressToast">Progress Toast</el-button>
  </div>
</template>
```

### Toast Container

```vue
<script setup>
import { ref } from 'vue'

const notifications = ref([])

const addNotification = (type, message) => {
  const id = Date.now()
  notifications.value.push({
    id,
    type,
    message,
    timestamp: new Date()
  })
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeNotification(id)
  }, 5000)
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const clearAll = () => {
  notifications.value = []
}
</script>

<template>
  <div class="notification-center">
    <div class="notification-controls">
      <el-button @click="addNotification('success', 'Task completed')">
        Add Success
      </el-button>
      <el-button @click="addNotification('error', 'Failed to save')">
        Add Error
      </el-button>
      <el-button @click="addNotification('info', 'System update available')">
        Add Info
      </el-button>
      <el-button @click="clearAll" :disabled="!notifications.length">
        Clear All
      </el-button>
    </div>
    
    <div class="notification-list">
      <transition-group name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="`notification--${notification.type}`"
        >
          <div class="notification-content">
            <el-icon>
              <component :is="getIcon(notification.type)" />
            </el-icon>
            <span>{{ notification.message }}</span>
          </div>
          
          <div class="notification-meta">
            <span class="time">
              {{ formatTime(notification.timestamp) }}
            </span>
            <el-button
              text
              size="small"
              @click="removeNotification(notification.id)"
            >
              <el-icon><close /></el-icon>
            </el-button>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.notification-center {
  max-width: 400px;
  margin: 0 auto;
}

.notification-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
}

.notification--success {
  border-left-color: var(--qelos-success);
}

.notification--error {
  border-left-color: var(--qelos-danger);
}

.notification--info {
  border-left-color: var(--qelos-info);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time {
  font-size: 12px;
  color: var(--qelos-text-secondary);
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
```

## 📱 skeleton-loader

Skeleton loading placeholder for various content types while data is loading.

### Text Skeletons

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(true)
const content = ref('')

const loadContent = async () => {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  content.value = 'This is the loaded content. It appears after the skeleton loader.'
  loading.value = false
}
</script>

<template>
  <div class="skeleton-demo">
    <el-button @click="loadContent" :disabled="loading">
      Load Content
    </el-button>
    
    <div class="content-container">
      <!-- Show skeleton while loading -->
      <skeleton-loader
        v-if="loading"
        type="text"
        :lines="3"
        animated
      />
      
      <!-- Show actual content when loaded -->
      <div v-else class="loaded-content">
        <p>{{ content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-container {
  margin-top: 20px;
  padding: 20px;
  background: var(--qelos-surface);
  border-radius: 4px;
}
</style>
```

### Card Skeleton

```vue
<script setup>
import { ref } from 'vue'

const loadingCards = ref(true)
const cards = ref([])

const loadCards = async () => {
  loadingCards.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  cards.value = Array(3).fill(0).map((_, i) => ({
    id: i + 1,
    title: `Card ${i + 1}`,
    description: `Description for card ${i + 1}`
  }))
  loadingCards.value = false
}
</script>

<template>
  <div class="card-skeletons">
    <el-button @click="loadCards" :disabled="loadingCards">
      Load Cards
    </el-button>
    
    <grid-layout :cols="{ xs: 1, md: 3 }" gap="20" style="margin-top: 20px">
      <!-- Show skeleton cards while loading -->
      <template v-if="loadingCards">
        <skeleton-loader
          v-for="i in 3"
          :key="i"
          type="card"
          :height="200"
          animated
        />
      </template>
      
      <!-- Show actual cards when loaded -->
      <data-card
        v-else
        v-for="card in cards"
        :key="card.id"
        :title="card.title"
      >
        {{ card.description }}
      </data-card>
    </grid-layout>
  </div>
</template>
```

### Table Skeleton

```vue
<script setup>
import { ref } from 'vue'

const loadingTable = ref(true)
const tableData = ref([])

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' }
]

const loadTableData = async () => {
  loadingTable.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  tableData.value = Array(5).fill(0).map((_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['Admin', 'User', 'Editor'][i % 3],
    status: ['Active', 'Inactive'][i % 2]
  }))
  loadingTable.value = false
}
</script>

<template>
  <div class="table-skeleton">
    <el-button @click="loadTableData" :disabled="loadingTable">
      Load Table Data
    </el-button>
    
    <div style="margin-top: 20px">
      <!-- Show table skeleton while loading -->
      <skeleton-loader
        v-if="loadingTable"
        type="table"
        :rows="5"
        :columns="4"
        animated
      />
      
      <!-- Show actual table when loaded -->
      <quick-table
        v-else
        :data="tableData"
        :columns="columns"
      />
    </div>
  </div>
</template>
```

### Custom Skeleton

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(true)

const customSkeleton = (
  <div class="custom-skeleton">
    <div class="skeleton-avatar"></div>
    <div class="skeleton-content">
      <div class="skeleton-line" style="width: 60%"></div>
      <div class="skeleton-line" style="width: 40%"></div>
      <div class="skeleton-line" style="width: 80%"></div>
    </div>
  </div>
)
</script>

<template>
  <div class="custom-skeleton-demo">
    <h3>User Profile</h3>
    
    <!-- Show custom skeleton while loading -->
    <div v-if="loading" class="skeleton-wrapper">
      <skeleton-loader
        type="custom"
        :template="customSkeleton"
        animated
      />
    </div>
    
    <!-- Show actual content when loaded -->
    <div v-else class="user-profile">
      <avatar src="/user-avatar.jpg" :size="60" />
      <div class="user-info">
        <h4>John Doe</h4>
        <p>john.doe@example.com</p>
        <p>Software Engineer</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-skeleton-demo {
  max-width: 400px;
  padding: 20px;
  background: var(--qelos-surface);
  border-radius: 8px;
}

.skeleton-wrapper {
  padding: 20px 0;
}

.user-profile {
  display: flex;
  gap: 15px;
  align-items: center;
}

.user-info h4 {
  margin: 0 0 5px 0;
}

.user-info p {
  margin: 0;
  color: var(--qelos-text-secondary);
  font-size: 14px;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `'text'` | Skeleton type: text, card, table, custom |
| `lines` | `number` | `3` | Number of lines (for text type) |
| `rows` | `number` | `5` | Number of rows (for table type) |
| `columns` | `number` | `4` | Number of columns (for table type) |
| `height` | `string/number` | - | Skeleton height |
| `animated` | `boolean` | `true` | Enable shimmer animation |
| `template` | `VNode` | - | Custom template (for custom type) |

## 📚 Next Steps

- [Form Components](/getting-started/components/form-components) - Input components
- [Data Components](/getting-started/components/data-components) - Tables and grids
- [Display Components](/getting-started/components/display-components) - Cards and badges
