# Display Components

Qelos provides a variety of display components for presenting data, status indicators, and visual feedback to users.

## 📦 data-card

Versatile card component for displaying grouped content with header, footer, and actions.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(false)
</script>

<template>
  <data-card
    title="User Profile"
    subtitle="Manage your account information"
    :loading="loading"
  >
    <div class="card-content">
      <p>This is the main content area of the card.</p>
      <p>You can put any content here.</p>
    </div>
  </data-card>
</template>
```

### With Header Actions and Footer

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(false)
const collapsed = ref(false)

const handleEdit = () => {
  console.log('Edit clicked')
}

const handleDelete = () => {
  console.log('Delete clicked')
}

const handleSave = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const handleExport = () => {
  console.log('Export clicked')
}
</script>

<template>
  <data-card
    title="Analytics Dashboard"
    subtitle="Real-time data overview"
    :loading="loading"
    :collapsible="true"
    v-model:collapsed="collapsed"
    shadow="hover"
  >
    <!-- Header extra content -->
    <template #extra>
      <el-dropdown>
        <el-button text>
          More <el-icon><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleExport">
              <export-icon /> Export Data
            </el-dropdown-item>
            <el-dropdown-item @click="handleEdit">
              <edit-icon /> Edit Settings
            </el-dropdown-item>
            <el-dropdown-item divided @click="handleDelete">
              <delete-icon /> Delete
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
    
    <!-- Main content -->
    <div class="analytics-content">
      <grid-layout :cols="{ xs: 1, sm: 2, lg: 4 }" gap="20">
        <stat-card title="Views" value="12,345" trend="+12%" />
        <stat-card title="Users" value="1,234" trend="+5%" />
        <stat-card title="Revenue" value="$45,678" trend="+18%" />
        <stat-card title="Conversion" value="3.2%" trend="-2%" />
      </grid-layout>
    </div>
    
    <!-- Footer actions -->
    <template #footer>
      <div class="card-footer">
        <el-button @click="handleExport">Export Report</el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">
          Save Changes
        </el-button>
      </div>
    </template>
  </data-card>
</template>

<style scoped>
.analytics-content {
  padding: 20px 0;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
```

### Nested Cards

```vue
<script setup>
import { ref } from 'vue'

const tasks = ref([
  { id: 1, title: 'Design new feature', status: 'in-progress' },
  { id: 2, title: 'Fix bug #123', status: 'completed' },
  { id: 3, title: 'Write documentation', status: 'pending' }
])
</script>

<template>
  <data-card title="Project Overview" border>
    <!-- Project details -->
    <el-descriptions :column="2" border>
      <el-descriptions-item label="Name">
        Qelos Platform Update
      </el-descriptions-item>
      <el-descriptions-item label="Status">
        <el-tag type="success">Active</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="Progress">
        <el-progress :percentage="65" />
      </el-descriptions-item>
      <el-descriptions-item label="Deadline">
        2024-03-15
      </el-descriptions-item>
    </el-descriptions>
    
    <!-- Nested task cards -->
    <div class="task-list">
      <h4>Recent Tasks</h4>
      <grid-layout :cols="{ xs: 1, md: 2, lg: 3 }" gap="15">
        <data-card
          v-for="task in tasks"
          :key="task.id"
          :title="task.title"
          size="small"
          shadow="never"
        >
          <el-tag
            :type="task.status === 'completed' ? 'success' : 
                   task.status === 'in-progress' ? 'warning' : 'info'"
            size="small"
          >
            {{ task.status }}
          </el-tag>
        </data-card>
      </grid-layout>
    </div>
  </data-card>
</template>

<style scoped>
.task-list {
  margin-top: 20px;
}

.task-list h4 {
  margin-bottom: 15px;
  color: var(--qelos-text-regular);
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title |
| `subtitle` | `string` | - | Card subtitle |
| `loading` | `boolean` | `false` | Loading state |
| `collapsible` | `boolean` | `false` | Can collapse |
| `collapsed` | `boolean` | `false` | Collapsed state |
| `border` | `boolean` | `false` | Show border |
| `shadow` | `string` | `'always'` | Shadow: always, hover, never |
| `size` | `string` | `'default'` | Size: small, default, large |
| `body-style` | `Object` | - | Body CSS styles |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Main content area |
| `header` | Custom header content |
| `extra` | Header extra content (right side) |
| `footer` | Footer content |

## 👤 avatar

User avatar with fallback, status indicator, and group support.

### Basic Avatar

```vue
<script setup>
import { ref } from 'vue'

const users = ref([
  { name: 'John Doe', avatar: '/avatars/john.jpg' },
  { name: 'Jane Smith', avatar: null },
  { name: 'Bob Johnson', avatar: '/avatars/bob.jpg' }
])
</script>

<template>
  <div class="avatar-list">
    <avatar
      v-for="user in users"
      :key="user.name"
      :src="user.avatar"
      :name="user.name"
      :size="50"
    />
  </div>
</template>
```

### With Status Indicator

```vue
<script setup>
import { ref } from 'vue'

const teamMembers = ref([
  { name: 'Alice', avatar: '/avatars/alice.jpg', status: 'online' },
  { name: 'Bob', avatar: '/avatars/bob.jpg', status: 'offline' },
  { name: 'Charlie', avatar: '/avatars/charlie.jpg', status: 'busy' },
  { name: 'Diana', avatar: '/avatars/diana.jpg', status: 'away' }
])

const handleMemberClick = (member) => {
  console.log('Clicked:', member.name)
}
</script>

<template>
  <div class="team-avatars">
    <avatar
      v-for="member in teamMembers"
      :key="member.name"
      :src="member.avatar"
      :name="member.name"
      :size="60"
      :status="member.status"
      clickable
      @click="handleMemberClick(member)"
    />
  </div>
</template>

<style scoped>
.team-avatars {
  display: flex;
  gap: 15px;
}
</style>
```

### Avatar Group

```vue
<script setup>
import { ref } from 'vue'

const projectTeam = ref([
  { name: 'Alice', avatar: '/avatars/alice.jpg' },
  { name: 'Bob', avatar: '/avatars/bob.jpg' },
  { name: 'Charlie', avatar: '/avatars/charlie.jpg' },
  { name: 'Diana', avatar: '/avatars/diana.jpg' },
  { name: 'Eve', avatar: '/avatars/eve.jpg' },
  { name: 'Frank', avatar: '/avatars/frank.jpg' }
])

const showAllMembers = ref(false)
</script>

<template>
  <div class="project-team">
    <h4>Project Team ({{ projectTeam.length }})</h4>
    
    <avatar-group :max="4" :total="projectTeam.length">
      <avatar
        v-for="member in projectTeam"
        :key="member.name"
        :src="member.avatar"
        :name="member.name"
        :size="40"
      />
    </avatar-group>
    
    <el-button
      v-if="!showAllMembers"
      text
      type="primary"
      @click="showAllMembers = true"
    >
      View all members
    </el-button>
    
    <!-- Show all members when expanded -->
    <div v-if="showAllMembers" class="all-members">
      <el-tag
        v-for="member in projectTeam"
        :key="member.name"
        class="member-tag"
      >
        <avatar
          :src="member.avatar"
          :name="member.name"
          :size="24"
          class="tag-avatar"
        />
        {{ member.name }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.project-team h4 {
  margin-bottom: 10px;
}

.all-members {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.tag-avatar {
  flex-shrink: 0;
}
</style>
```

### Props

#### Avatar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Image URL |
| `name` | `string` | - | Name for fallback |
| `size` | `number/string` | `40` | Avatar size |
| `shape` | `string` | `'circle'` | Shape: circle, square |
| `status` | `string` | - | Status: online, offline, busy, away |
| `clickable` | `boolean` | `false` | Clickable |
| `border` | `boolean` | `false` | Show border |

#### Avatar Group Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `max` | `number` | - | Maximum avatars to show |
| `total` | `number` | - | Total count for overflow indicator |
| `size` | `number/string` | `40` | Avatar size |
| `collapse` | `boolean` | `true` | Collapse overflow |

## 🏷️ badge

Small count and status component for notifications and labels.

### Basic Badges

```vue
<script setup>
import { ref } from 'vue'

const unreadCount = ref(5)
const notifications = ref(12)
const tasks = ref(3)
</script>

<template>
  <div class="badges-demo">
    <!-- Number badge -->
    <el-badge :value="unreadCount" :max="99">
      <el-button>Messages</el-button>
    </el-badge>
    
    <!-- Dot badge -->
    <el-badge is-dot>
      <el-button>Notifications</el-button>
    </el-badge>
    
    <!-- Custom badge -->
    <el-badge :value="notifications" type="primary">
      <el-button icon="bell">Alerts</el-button>
    </el-badge>
    
    <!-- With custom content -->
    <el-badge :value="tasks" type="warning">
      <el-icon><document /></el-icon>
    </el-badge>
  </div>
</template>
```

### Status Badges

```vue
<script setup>
import { ref } from 'vue'

const orders = ref([
  { id: 1, status: 'pending', label: 'Pending' },
  { id: 2, status: 'processing', label: 'Processing' },
  { id: 3, status: 'shipped', label: 'Shipped' },
  { id: 4, status: 'delivered', label: 'Delivered' },
  { id: 5, status: 'cancelled', label: 'Cancelled' }
])

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'primary',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}
</script>

<template>
  <div class="order-statuses">
    <div v-for="order in orders" :key="order.id" class="order-item">
      <span class="order-id">#{{ order.id }}</span>
      <el-tag :type="getStatusType(order.status)" size="small">
        {{ order.label }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.order-statuses {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--qelos-surface);
  border-radius: 4px;
}

.order-id {
  font-weight: 500;
}
</style>
```

### Custom Badge Component

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  max: { type: Number, default: 99 },
  type: { type: String, default: 'default' },
  size: { type: String, default: 'small' },
  dot: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false }
})

const displayValue = computed(() => {
  if (props.dot) return ''
  if (typeof props.value === 'number' && props.max) {
    return props.value > props.max ? `${props.max}+` : props.value
  }
  return props.value
})

const badgeClass = computed(() => [
  'custom-badge',
  `custom-badge--${props.type}`,
  `custom-badge--${props.size}`,
  { 'custom-badge--dot': props.dot }
])
</script>

<template>
  <div v-if="!hidden && (dot || value)" :class="badgeClass">
    {{ displayValue }}
  </div>
</template>

<style scoped>
.custom-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 10px;
  white-space: nowrap;
}

.custom-badge--dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}

.custom-badge--default {
  background: var(--qelos-info);
  color: white;
}

.custom-badge--primary {
  background: var(--qelos-primary);
  color: white;
}

.custom-badge--success {
  background: var(--qelos-success);
  color: white;
}

.custom-badge--warning {
  background: var(--qelos-warning);
  color: white;
}

.custom-badge--danger {
  background: var(--qelos-danger);
  color: white;
}
</style>
```

## 📊 progress

Progress bar for showing completion status.

### Basic Progress

```vue
<script setup>
import { ref } from 'vue'

const progress = ref(0)

// Simulate progress
const startProgress = () => {
  progress.value = 0
  const interval = setInterval(() => {
    progress.value += 10
    if (progress.value >= 100) {
      clearInterval(interval)
    }
  }, 500)
}
</script>

<template>
  <div class="progress-demo">
    <el-progress :percentage="progress" />
    <el-button @click="startProgress" style="margin-top: 20px">
      Start Progress
    </el-button>
  </div>
</template>
```

### Different Types

```vue
<script setup>
import { ref } from 'vue'

const linearProgress = ref(75)
const circleProgress = ref(60)
const dashboardProgress = ref(85)

const tasks = ref([
  { name: 'Design', completed: true },
  { name: 'Development', completed: true },
  { name: 'Testing', completed: false },
  { name: 'Deployment', completed: false }
])

const overallProgress = computed(() => {
  const completed = tasks.value.filter(t => t.completed).length
  return (completed / tasks.value.length) * 100
})
</script>

<template>
  <div class="progress-types">
    <!-- Linear progress -->
    <div class="progress-item">
      <h4>Linear Progress</h4>
      <el-progress :percentage="linearProgress" :color="'#409eff'" />
      <el-progress
        :percentage="linearProgress"
        status="success"
        :show-text="false"
        style="margin-top: 10px"
      />
    </div>
    
    <!-- Circle progress -->
    <div class="progress-item">
      <h4>Circle Progress</h4>
      <el-progress
        type="circle"
        :percentage="circleProgress"
        :width="120"
      />
    </div>
    
    <!-- Dashboard progress -->
    <div class="progress-item">
      <h4>Dashboard Progress</h4>
      <el-progress
        type="dashboard"
        :percentage="dashboardProgress"
        :width="120"
      />
    </div>
    
    <!-- Task progress -->
    <div class="progress-item">
      <h4>Task Completion</h4>
      <div class="task-list">
        <div
          v-for="task in tasks"
          :key="task.name"
          class="task-item"
        >
          <el-checkbox
            v-model="task.completed"
            :label="task.name"
          />
        </div>
      </div>
      <el-progress
        :percentage="overallProgress"
        :color="overallProgress === 100 ? '#67c23a' : '#409eff'"
        style="margin-top: 15px"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.progress-item h4 {
  margin-bottom: 15px;
  color: var(--qelos-text-regular);
}

.task-list {
  margin-bottom: 15px;
}

.task-item {
  margin-bottom: 8px;
}
</style>
```

### Custom Progress

```vue
<script setup>
import { ref } from 'vue'

const customProgress = ref(30)

const progressColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#5cb87a', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#6f7ad3', percentage: 100 }
]

const getProgressColor = (percentage) => {
  const color = progressColors.find(c => percentage <= c.percentage)
  return color ? color.color : '#6f7ad3'
}
</script>

<template>
  <div class="custom-progress">
    <el-progress
      :percentage="customProgress"
      :color="getProgressColor(customProgress)"
      :stroke-width="15"
      :text-inside="true"
    />
    
    <div class="progress-marks">
      <span
        v-for="mark in [0, 20, 40, 60, 80, 100]"
        :key="mark"
        class="progress-mark"
        :style="{ left: mark + '%' }"
      >
        {{ mark }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.custom-progress {
  position: relative;
  padding: 20px 0;
}

.progress-marks {
  position: relative;
  margin-top: 5px;
}

.progress-mark {
  position: absolute;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--qelos-text-secondary);
}
</style>
```

## 📚 Next Steps

- [Form Components](/getting-started/components/form-components) - Input components
- [Data Components](/getting-started/components/data-components) - Tables and grids
- [Layout Components](/getting-started/components/layout-components) - Layout utilities
