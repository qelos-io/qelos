# Layout Components

Qelos provides flexible layout components to help you structure your application pages and create responsive designs.

## 📄 page-container

Main layout wrapper for pages with header, sidebar, and content areas.

### Basic Layout

```vue
<script setup>
import { ref } from 'vue'

const pageTitle = ref('Dashboard')
const breadcrumb = ref([
  { text: 'Home', to: '/' },
  { text: 'Dashboard' }
])

const handleCreate = () => {
  console.log('Create clicked')
}
</script>

<template>
  <page-container>
    <!-- Page header -->
    <template #header>
      <page-title :title="pageTitle" :breadcrumb="breadcrumb">
        <template #actions>
          <el-button @click="handleCreate" type="primary">
            Create New
          </el-button>
        </template>
      </page-title>
    </template>
    
    <!-- Main content -->
    <div class="dashboard-content">
      <h2>Welcome to Dashboard</h2>
      <p>Your main content goes here.</p>
    </div>
  </page-container>
</template>
```

### With Sidebar

```vue
<script setup>
import { ref } from 'vue'

const filters = ref({
  status: '',
  dateRange: [],
  category: ''
})

const statistics = ref([
  { label: 'Total Users', value: 1234, trend: '+12%' },
  { label: 'Revenue', value: '$45,678', trend: '+23%' },
  { label: 'Orders', value: 567, trend: '-5%' }
])

const applyFilters = () => {
  console.log('Applying filters:', filters.value)
}

const resetFilters = () => {
  filters.value = {
    status: '',
    dateRange: [],
    category: ''
  }
}
</script>

<template>
  <page-container>
    <!-- Header -->
    <template #header>
      <page-title title="Analytics">
        <template #subtitle>
          View your business metrics and performance
        </template>
      </page-title>
    </template>
    
    <!-- Sidebar -->
    <template #sidebar>
      <data-card title="Filters" size="small">
        <el-form label-position="top">
          <el-form-item label="Status">
            <el-select v-model="filters.status" placeholder="All statuses">
              <el-option label="Active" value="active" />
              <el-option label="Inactive" value="inactive" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="Date Range">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              placeholder="Select range"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="Category">
            <el-select v-model="filters.category" placeholder="All categories">
              <el-option label="Sales" value="sales" />
              <el-option label="Marketing" value="marketing" />
              <el-option label="Support" value="support" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="applyFilters" style="width: 100%">
              Apply Filters
            </el-button>
            <el-button @click="resetFilters" style="width: 100%; margin-top: 8px">
              Reset
            </el-button>
          </el-form-item>
        </el-form>
      </data-card>
    </template>
    
    <!-- Main content -->
    <div class="analytics-content">
      <!-- Statistics cards -->
      <grid-layout :cols="{ xs: 1, sm: 2, lg: 3 }" gap="20">
        <stat-card
          v-for="stat in statistics"
          :key="stat.label"
          :title="stat.label"
          :value="stat.value"
          :trend="stat.trend"
        />
      </grid-layout>
      
      <!-- Charts and tables -->
      <data-card title="Performance Chart" style="margin-top: 20px">
        <!-- Chart content -->
        <div class="chart-placeholder">
          Chart will be rendered here
        </div>
      </data-card>
    </div>
  </page-container>
</template>

<style scoped>
.analytics-content {
  padding: 20px 0;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--qelos-surface-hover);
  border-radius: 4px;
  color: var(--qelos-text-secondary);
}
</style>
```

### With Custom Footer

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(false)
const data = ref([])

const loadData = async () => {
  loading.value = true
  try {
    // Fetch data
    await new Promise(resolve => setTimeout(resolve, 1000))
    data.value = Array(50).fill(0).map((_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`
    }))
  } finally {
    loading.value = false
  }
}

const exportData = () => {
  console.log('Exporting data:', data.value)
}

const refreshData = () => {
  loadData()
}
</script>

<template>
  <page-container>
    <template #header>
      <page-title title="Data Management" />
    </template>
    
    <template #footer>
      <div class="page-footer">
        <div class="footer-info">
          <span>Total: {{ data.length }} items</span>
          <span v-if="loading">Loading...</span>
        </div>
        <div class="footer-actions">
          <el-button @click="exportData" :disabled="!data.length">
            Export
          </el-button>
          <el-button @click="refreshData" :loading="loading">
            Refresh
          </el-button>
        </div>
      </div>
    </template>
    
    <div class="data-content">
      <quick-table
        :data="data"
        :loading="loading"
        :columns="[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' }
        ]"
      />
    </div>
  </page-container>
</template>

<style scoped>
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid var(--qelos-border);
  margin-top: 20px;
}

.footer-info {
  display: flex;
  gap: 20px;
  color: var(--qelos-text-secondary);
}

.footer-actions {
  display: flex;
  gap: 10px;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `string/number` | - | Container padding |
| `max-width` | `string/number` | - | Maximum width |
| `fluid` | `boolean` | `false` | Full width container |
| `centered` | `boolean` | `false` | Center content |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Main content area |
| `header` | Page header |
| `sidebar` | Left sidebar |
| `footer` | Page footer |

## 📐 grid-layout

Responsive grid system with auto-fit and masonry support.

### Basic Grid

```vue
<script setup>
import { ref } from 'vue'

const items = ref(Array(12).fill(0).map((_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
  content: `Content for item ${i + 1}`
}))

const cols = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6
}
</script>

<template>
  <div class="grid-demo">
    <h3>Responsive Grid</h3>
    <grid-layout :cols="cols" gap="20">
      <data-card
        v-for="item in items"
        :key="item.id"
        :title="item.title"
        size="small"
      >
        {{ item.content }}
      </data-card>
    </grid-layout>
  </div>
</template>
```

### Custom Column Spans

```vue
<script setup>
import { ref } from 'vue'

const layoutSections = ref([
  { span: 8, content: 'Main content (8/12)' },
  { span: 4, content: 'Sidebar (4/12)' },
  { span: 12, content: 'Full width (12/12)' },
  { span: 6, content: 'Half width (6/12)' },
  { span: 6, content: 'Half width (6/12)' }
])
</script>

<template>
  <div class="custom-grid">
    <grid-layout :cols="12" gap="20">
      <div
        v-for="(section, index) in layoutSections"
        :key="index"
        class="grid-section"
        :span="section.span"
      >
        <data-card :title="`Span ${section.span}`">
          {{ section.content }}
        </data-card>
      </div>
    </grid-layout>
  </div>
</template>

<style scoped>
.grid-section {
  min-height: 100px;
}
</style>
```

### Masonry Layout

```vue
<script setup>
import { ref } from 'vue'

const masonryItems = ref([
  { id: 1, height: 200, color: '#409eff' },
  { id: 2, height: 150, color: '#67c23a' },
  { id: 3, height: 250, color: '#e6a23c' },
  { id: 4, height: 180, color: '#f56c6c' },
  { id: 5, height: 220, color: '#909399' },
  { id: 6, height: 160, color: '#409eff' },
  { id: 7, height: 190, color: '#67c23a' },
  { id: 8, height: 210, color: '#e6a23c' }
])
</script>

<template>
  <div class="masonry-demo">
    <h3>Masonry Layout</h3>
    <grid-layout :cols="{ xs: 1, sm: 2, lg: 3, xl: 4 }" gap="15" masonry>
      <div
        v-for="item in masonryItems"
        :key="item.id"
        class="masonry-item"
        :style="{ height: item.height + 'px', background: item.color }"
      >
        <div class="item-content">
          <h4>Item {{ item.id }}</h4>
          <p>Height: {{ item.height }}px</p>
        </div>
      </div>
    </grid-layout>
  </div>
</template>

<style scoped>
.masonry-demo h3 {
  margin-bottom: 20px;
}

.masonry-item {
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
}

.item-content {
  text-align: center;
}

.item-content h4 {
  margin: 0 0 5px 0;
}

.item-content p {
  margin: 0;
  opacity: 0.9;
}
</style>
```

### Auto-Fit Grid

```vue
<script setup>
import { ref } from 'vue'

const products = ref(Array(20).fill(0).map((_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: Math.floor(Math.random() * 100) + 10
})))
</script>

<template>
  <div class="auto-fit-grid">
    <h3>Auto-Fit Grid</h3>
    <p>Cards automatically adjust to available space</p>
    
    <grid-layout :cols="{ min: '250px', max: '1fr' }" gap="20">
      <data-card
        v-for="product in products"
        :key="product.id"
        :title="product.name"
        size="small"
      >
        <div class="product-info">
          <p class="price">${{ product.price }}</p>
          <el-button size="small" type="primary">View Details</el-button>
        </div>
      </data-card>
    </grid-layout>
  </div>
</template>

<style scoped>
.auto-fit-grid p {
  color: var(--qelos-text-secondary);
  margin-bottom: 20px;
}

.product-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.price {
  font-weight: 600;
  color: var(--qelos-primary);
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cols` | `number/Object` | `12` | Column count or responsive config |
| `gap` | `string/number` | `0` | Gap between items |
| `masonry` | `boolean` | `false` | Enable masonry layout |
| `auto-fit` | `boolean` | `false` | Auto-fit columns |

### Responsive Columns

```javascript
// Responsive column configuration
const cols = {
  xs: 1,    // Mobile (< 576px)
  sm: 2,    // Small tablets (≥ 576px)
  md: 3,    // Tablets (≥ 768px)
  lg: 4,    // Desktop (≥ 992px)
  xl: 5,    // Large desktop (≥ 1200px)
  xxl: 6    // Extra large (≥ 1400px)
}

// Auto-fit configuration
const autoFitCols = {
  min: '300px',  // Minimum column width
  max: '1fr'     // Maximum column width
}
```

## 📑 page-section

Section component for organizing page content with optional background and spacing.

### Basic Sections

```vue
<script setup>
import { ref } from 'vue'

const sections = ref([
  {
    title: 'Introduction',
    content: 'This is the introduction section with important information.',
    background: 'default'
  },
  {
    title: 'Features',
    content: 'Here we highlight the key features of our product.',
    background: 'light'
  },
  {
    title: 'Get Started',
    content: 'Ready to begin? Follow these simple steps.',
    background: 'primary',
    dark: true
  }
])
</script>

<template>
  <div class="page-sections">
    <page-section
      v-for="(section, index) in sections"
      :key="index"
      :title="section.title"
      :background="section.background"
      :dark="section.dark"
      :padding="index === 0 ? 'large' : 'medium'"
    >
      <p>{{ section.content }}</p>
      
      <template v-if="index === 2" #actions>
        <el-button size="large" type="primary">
          Get Started Now
        </el-button>
      </template>
    </page-section>
  </div>
</template>
```

### Feature Grid Section

```vue
<script setup>
import { ref } from 'vue'

const features = ref([
  {
    icon: 'rocket',
    title: 'Fast Performance',
    description: 'Lightning fast loading times and smooth interactions.'
  },
  {
    icon: 'shield',
    title: 'Secure',
    description: 'Enterprise-grade security to protect your data.'
  },
  {
    icon: 'mobile',
    title: 'Mobile Ready',
    description: 'Responsive design that works on all devices.'
  },
  {
    icon: 'chart',
    title: 'Analytics',
    description: 'Detailed insights and analytics for your data.'
  },
  {
    icon: 'users',
    title: 'Team Collaboration',
    description: 'Work together seamlessly with your team.'
  },
  {
    icon: 'settings',
    title: 'Customizable',
    description: 'Tailor the experience to your specific needs.'
  }
])
</script>

<template>
  <page-section
    title="Powerful Features"
    subtitle="Everything you need to succeed"
    background="light"
    padding="large"
  >
    <grid-layout :cols="{ xs: 1, sm: 2, lg: 3 }" gap="30">
      <div v-for="feature in features" :key="feature.title" class="feature-card">
        <div class="feature-icon">
          <el-icon :size="48"><component :is="feature.icon" /></el-icon>
        </div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </div>
    </grid-layout>
  </page-section>
</template>

<style scoped>
.feature-card {
  text-align: center;
  padding: 30px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  color: var(--qelos-primary);
  margin-bottom: 20px;
}

.feature-card h3 {
  margin-bottom: 10px;
  color: var(--qelos-text-primary);
}

.feature-card p {
  color: var(--qelos-text-secondary);
  line-height: 1.6;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Section title |
| `subtitle` | `string` | - | Section subtitle |
| `background` | `string` | `'default'` | Background: default, light, dark, primary |
| `dark` | `boolean` | `false` | Dark text mode |
| `padding` | `string` | `'medium'` | Padding: none, small, medium, large |
| `full-width` | `boolean` | `false` | Full width section |
| `container` | `boolean` | `true` | Wrap in container |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Section content |
| `actions` | Action buttons area |
| `background` | Custom background content |

## 📱 responsive-container

Container that provides responsive breakpoints for conditional rendering.

### Responsive Content

```vue
<script setup>
import { ref } from 'vue'

const screenSize = ref('unknown')

const handleScreenChange = (size) => {
  screenSize.value = size
  console.log('Screen size changed to:', size)
}
</script>

<template>
  <responsive-container @change="handleScreenChange">
    <template #default="{ size, isMobile, isTablet, isDesktop }">
      <div class="responsive-demo">
        <p>Current screen: {{ size }}</p>
        <p>Is mobile: {{ isMobile }}</p>
        <p>Is tablet: {{ isTablet }}</p>
        <p>Is desktop: {{ isDesktop }}</p>
        
        <!-- Mobile only content -->
        <div v-if="isMobile" class="mobile-content">
          <el-button type="primary" block>
            Mobile Action
          </el-button>
        </div>
        
        <!-- Desktop content -->
        <div v-else-if="isDesktop" class="desktop-content">
          <el-button-group>
            <el-button>Action 1</el-button>
            <el-button>Action 2</el-button>
            <el-button>Action 3</el-button>
          </el-button-group>
        </div>
        
        <!-- Tablet content -->
        <div v-else class="tablet-content">
          <el-button>Action</el-button>
        </div>
      </div>
    </template>
  </responsive-container>
</template>

<style scoped>
.responsive-demo {
  padding: 20px;
  text-align: center;
}

.mobile-content,
.tablet-content,
.desktop-content {
  margin-top: 20px;
  padding: 20px;
  background: var(--qelos-surface);
  border-radius: 4px;
}
</style>
```

### Breakpoint-Specific Layouts

```vue
<template>
  <responsive-container>
    <template #xs="{ size }">
      <!-- Mobile layout -->
      <grid-layout :cols="1" gap="10">
        <data-card v-for="i in 4" :key="i" :title="`Card ${i}`" size="small">
          Mobile card {{ i }}
        </data-card>
      </grid-layout>
    </template>
    
    <template #sm="{ size }">
      <!-- Small tablet layout -->
      <grid-layout :cols="2" gap="15">
        <data-card v-for="i in 4" :key="i" :title="`Card ${i}`" size="small">
          Tablet card {{ i }}
        </data-card>
      </grid-layout>
    </template>
    
    <template #md="{ size }">
      <!-- Tablet layout -->
      <grid-layout :cols="2" gap="20">
        <data-card v-for="i in 4" :key="i" :title="`Card ${i}`">
          Tablet card {{ i }}
        </data-card>
      </grid-layout>
    </template>
    
    <template #lg="{ size }">
      <!-- Desktop layout -->
      <grid-layout :cols="4" gap="20">
        <data-card v-for="i in 4" :key="i" :title="`Card ${i}`">
          Desktop card {{ i }}
        </data-card>
      </grid-layout>
    </template>
    
    <template #xl="{ size }">
      <!-- Large desktop layout -->
      <grid-layout :cols="4" gap="25">
        <data-card v-for="i in 4" :key="i" :title="`Card ${i}`">
          Large desktop card {{ i }}
        </data-card>
      </grid-layout>
    </template>
  </responsive-container>
</template>
```

### Breakpoints

| Breakpoint | Min Width | Max Width |
|------------|-----------|-----------|
| `xs` | 0 | 575px |
| `sm` | 576px | 767px |
| `md` | 768px | 991px |
| `lg` | 992px | 1199px |
| `xl` | 1200px | 1599px |
| `xxl` | 1600px | ∞ |

## 📚 Next Steps

- [Form Components](/getting-started/components/form-components) - Input components
- [Data Components](/getting-started/components/data-components) - Tables and grids
- [Display Components](/getting-started/components/display-components) - Cards and badges
