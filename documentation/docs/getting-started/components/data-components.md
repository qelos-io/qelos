# Data Components

Qelos provides powerful data components for displaying, editing, and managing tabular data with advanced features like sorting, filtering, and real-time updates.

## 📊 quick-table

A powerful data table with sorting, filtering, pagination, and custom cell rendering.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const tableData = ref([
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', status: 'Inactive' }
])

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' }
]
</script>

<template>
  <quick-table
    :data="tableData"
    :columns="columns"
    stripe
    border
  />
</template>
```

### Advanced Features

```vue
<script setup>
import { ref, computed } from 'vue'

const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const tableData = ref([])
const total = ref(0)

const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    width: '200px',
    fixed: 'left'
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    width: '250px'
  },
  {
    key: 'role',
    label: 'Role',
    filterable: true,
    filters: [
      { text: 'Admin', value: 'admin' },
      { text: 'User', value: 'user' },
      { text: 'Editor', value: 'editor' }
    ],
    width: '120px'
  },
  {
    key: 'status',
    label: 'Status',
    component: 'status-badge',
    width: '100px'
  },
  {
    key: 'createdAt',
    label: 'Created',
    sortable: true,
    formatter: (row) => formatDate(row.createdAt),
    width: '150px'
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '150px',
    fixed: 'right'
  }
]

const pagination = computed(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  total: total.value
}))

const handleSort = ({ prop, order }) => {
  console.log('Sort by:', prop, order)
  loadData()
}

const handleFilter = (filters) => {
  console.log('Filters:', filters)
  currentPage.value = 1
  loadData()
}

const handleRowClick = (row) => {
  console.log('Row clicked:', row)
  // Navigate to detail page
}

const handlePageChange = (page) => {
  currentPage.value = page
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value
    }
    const response = await fetchUsers(params)
    tableData.value = response.data
    total.value = response.total
  } finally {
    loading.value = false
  }
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
    @page-change="handlePageChange"
  >
    <!-- Custom status column -->
    <template #status="{ row }">
      <el-tag :type="row.status === 'Active' ? 'success' : 'danger'">
        {{ row.status }}
      </el-tag>
    </template>
    
    <!-- Actions column -->
    <template #actions="{ row }">
      <el-button-group>
        <el-button size="small" @click.stop="editUser(row)">
          Edit
        </el-button>
        <el-button size="small" type="danger" @click.stop="deleteUser(row)">
          Delete
        </el-button>
      </el-button-group>
    </template>
    
    <!-- Empty state -->
    <template #empty>
      <empty-state
        image="/no-data.svg"
        title="No users found"
        description="Try adjusting your filters or search criteria"
      >
        <el-button type="primary" @click="createUser">
          Add First User
        </el-button>
      </empty-state>
    </template>
  </quick-table>
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array` | `[]` | Table data |
| `columns` | `Array` | `[]` | Column configuration |
| `loading` | `boolean` | `false` | Loading state |
| `stripe` | `boolean` | `false` | Striped rows |
| `border` | `boolean` | `false` | Table border |
| `height` | `string/number` | - | Table height |
| `max-height` | `string/number` | - | Maximum table height |
| `pagination` | `Object` | - | Pagination configuration |
| `default-sort` | `Object` | - | Default sort order |
| `highlight-current-row` | `boolean` | `false` | Highlight current row |
| `show-summary` | `boolean` | `false` | Show summary row |
| `summary-method` | `Function` | - | Summary calculation method |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sort-change` | `{ prop, order }` | Sort order changed |
| `filter-change` | `filters` | Filters changed |
| `row-click` | `row, column, event` | Row clicked |
| `row-dblclick` | `row, column, event` | Row double-clicked |
| `selection-change` | `selection` | Row selection changed |
| `page-change` | `page` | Page changed |
| `size-change` | `size` | Page size changed |

## 💻 monaco-editor

VS Code editor component for code editing with syntax highlighting, IntelliSense, and more.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const code = ref(`function hello() {
  console.log("Hello, World!");
}`)

const handleCodeChange = (value) => {
  console.log('Code changed:', value)
}
</script>

<template>
  <monaco-editor
    v-model="code"
    language="javascript"
    @change="handleCodeChange"
  />
</template>
```

### Advanced Configuration

```vue
<script setup>
import { ref, computed } from 'vue'

const code = ref('')
const language = ref('javascript')
const theme = ref('vs-dark')

const options = computed(() => ({
  theme: theme.value,
  language: language.value,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineNumbers: 'on',
  wordWrap: 'on',
  folding: true,
  foldingStrategy: 'indentation',
  showFoldingControls: 'always',
  contextmenu: true,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: true,
  parameterHints: { enabled: true },
  hover: { enabled: true },
  definitionLink: { enabled: true },
  codeLens: false,
  errorLens: true
}))

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' }
]

const themes = [
  { value: 'vs', label: 'Light' },
  { value: 'vs-dark', label: 'Dark' },
  { value: 'hc-black', label: 'High Contrast' }
]

const handleSave = () => {
  console.log('Saving code:', code.value)
}

const handleFormat = () => {
  // Format code using Monaco's built-in formatter
}
</script>

<template>
  <div class="editor-container">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <el-select v-model="language" placeholder="Language">
        <el-option
          v-for="lang in languages"
          :key="lang.value"
          :label="lang.label"
          :value="lang.value"
        />
      </el-select>
      
      <el-select v-model="theme" placeholder="Theme">
        <el-option
          v-for="t in themes"
          :key="t.value"
          :label="t.label"
          :value="t.value"
        />
      </el-select>
      
      <el-button @click="handleFormat">
        Format
      </el-button>
      
      <el-button type="primary" @click="handleSave">
        Save
      </el-button>
    </div>
    
    <!-- Editor -->
    <monaco-editor
      v-model="code"
      :options="options"
      :language="language"
      height="500px"
      @change="handleCodeChange"
    />
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: var(--qelos-surface);
  border: 1px solid var(--qelos-border);
  border-bottom: none;
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | - | Editor content |
| `language` | `string` | `'plaintext'` | Language mode |
| `theme` | `string` | `'vs'` | Editor theme |
| `options` | `Object` | `{}` | Monaco editor options |
| `height` | `string/number` | `'300px'` | Editor height |
| `width` | `string/number` | `'100%'` | Editor width |
| `readonly` | `boolean` | `false` | Read-only mode |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `value` | Content changed |
| `ready` | `editor` | Editor ready |
| `focus` | `event` | Editor focused |
| `blur` | `event` | Editor blurred |

## 📋 data-grid

Spreadsheet-like data grid for editing tabular data with cell validation and formulas.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const gridData = ref([
  { product: 'Apple', price: 1.99, stock: 100, category: 'Fruits' },
  { product: 'Banana', price: 0.99, stock: 200, category: 'Fruits' },
  { product: 'Milk', price: 3.49, stock: 50, category: 'Dairy' }
])

const columns = [
  { field: 'product', header: 'Product', editable: true },
  { field: 'price', header: 'Price', type: 'number', editable: true },
  { field: 'stock', header: 'Stock', type: 'number', editable: true },
  { field: 'category', header: 'Category', editable: true }
]

const handleCellEdit = ({ rowIndex, field, value }) => {
  console.log(`Cell edited: [${rowIndex}, ${field}] = ${value}`)
  // Save to backend
}

const handleCellChange = ({ rowIndex, field, value, oldValue }) => {
  console.log(`Cell changed: ${oldValue} -> ${value}`)
}
</script>

<template>
  <data-grid
    :data="gridData"
    :columns="columns"
    @cell-edit="handleCellEdit"
    @cell-change="handleCellChange"
  />
</template>
```

### Advanced Features

```vue
<script setup>
import { ref } from 'vue'

const gridData = ref([
  { name: 'Product A', price: 100, quantity: 10, discount: 0.1 },
  { name: 'Product B', price: 200, quantity: 5, discount: 0.15 }
])

const columns = [
  {
    field: 'name',
    header: 'Product Name',
    editable: true,
    validation: { required: true, minLength: 2 }
  },
  {
    field: 'price',
    header: 'Price',
    type: 'number',
    editable: true,
    validation: { min: 0, required: true },
    formatter: (value) => `$${value.toFixed(2)}`
  },
  {
    field: 'quantity',
    header: 'Quantity',
    type: 'number',
    editable: true,
    validation: { min: 0, integer: true, required: true }
  },
  {
    field: 'discount',
    header: 'Discount',
    type: 'number',
    editable: true,
    validation: { min: 0, max: 1 },
    formatter: (value) => `${(value * 100).toFixed(0)}%`
  },
  {
    field: 'total',
    header: 'Total',
    type: 'number',
    editable: false,
    formula: (row) => row.price * row.quantity * (1 - row.discount),
    formatter: (value) => `$${value.toFixed(2)}`
  }
]

const addRow = () => {
  gridData.value.push({
    name: '',
    price: 0,
    quantity: 0,
    discount: 0
  })
}

const deleteRow = (index) => {
  gridData.value.splice(index, 1)
}

const validateRow = (row) => {
  const errors = []
  if (!row.name) errors.push('Name is required')
  if (row.price <= 0) errors.push('Price must be positive')
  if (row.quantity <= 0) errors.push('Quantity must be positive')
  return errors
}

const saveGrid = async () => {
  const errors = []
  gridData.value.forEach((row, index) => {
    const rowErrors = validateRow(row)
    if (rowErrors.length > 0) {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`)
    }
  })
  
  if (errors.length > 0) {
    ElMessage.error(errors.join('\n'))
    return
  }
  
  // Save to backend
  await saveGridData(gridData.value)
  ElMessage.success('Data saved successfully!')
}
</script>

<template>
  <div class="data-grid-container">
    <div class="grid-toolbar">
      <el-button @click="addRow" type="primary">
        Add Row
      </el-button>
      <el-button @click="saveGrid">
        Save All
      </el-button>
    </div>
    
    <data-grid
      :data="gridData"
      :columns="columns"
      :row-actions="[
        { label: 'Delete', action: deleteRow, type: 'danger' }
      ]"
      @cell-edit="handleCellEdit"
      @row-action="handleRowAction"
    />
  </div>
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array` | `[]` | Grid data |
| `columns` | `Array` | `[]` | Column configuration |
| `editable` | `boolean` | `true` | Global editable flag |
| `row-actions` | `Array` | `[]` | Row action buttons |
| `height` | `string/number` | `'400px'` | Grid height |
| `show-toolbar` | `boolean` | `true` | Show built-in toolbar |

### Column Configuration

```typescript
interface Column {
  field: string          // Data field
  header: string         // Column header
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean'
  editable?: boolean     // Editable flag
  validation?: {         // Validation rules
    required?: boolean
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value) => boolean | string
  }
  formatter?: (value) => string  // Format display value
  parser?: (value) => any        // Parse input value
  formula?: (row) => any         // Computed value
  options?: Array               // Options for select type
  width?: string | number       // Column width
  align?: 'left' | 'center' | 'right'
}
```

## 📈 stat-card

Display statistics with trends, icons, and animations.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const stats = ref([
  {
    title: 'Total Revenue',
    value: 123456,
    prefix: '$',
    format: 'currency',
    trend: '+12.5%',
    trendDirection: 'up',
    icon: 'trending-up',
    color: 'success'
  },
  {
    title: 'Active Users',
    value: 8934,
    format: 'number',
    trend: '+234',
    trendDirection: 'up',
    icon: 'users',
    color: 'primary'
  },
  {
    title: 'Conversion Rate',
    value: 3.24,
    format: 'percentage',
    trend: '-0.5%',
    trendDirection: 'down',
    icon: 'chart',
    color: 'warning'
  }
])
</script>

<template>
  <grid-layout :cols="{ xs: 1, md: 2, lg: 4 }" gap="20">
    <stat-card
      v-for="stat in stats"
      :key="stat.title"
      :title="stat.title"
      :value="stat.value"
      :prefix="stat.prefix"
      :format="stat.format"
      :trend="stat.trend"
      :trend-direction="stat.trendDirection"
      :icon="stat.icon"
      :color="stat.color"
    />
  </grid-layout>
</template>
```

### Real-time Updates

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const revenue = ref(0)
const revenueTrend = ref('+0%')
const loading = ref(false)

let updateInterval = null

const fetchRevenue = async () => {
  loading.value = true
  try {
    const response = await getRevenueStats()
    const oldValue = revenue.value
    revenue.value = response.total
    
    // Calculate trend
    if (oldValue > 0) {
      const change = ((revenue.value - oldValue) / oldValue * 100).toFixed(1)
      revenueTrend.value = change >= 0 ? `+${change}%` : `${change}%`
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRevenue()
  updateInterval = setInterval(fetchRevenue, 30000) // Update every 30 seconds
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<template>
  <stat-card
    title="Live Revenue"
    :value="revenue"
    prefix="$"
    format="currency"
    :trend="revenueTrend"
    :trend-direction="revenueTrend.startsWith('+') ? 'up' : 'down'"
    icon="dollar-sign"
    color="success"
    :loading="loading"
    :animated="true"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title |
| `value` | `number` | - | Main value |
| `prefix` | `string` | - | Value prefix |
| `suffix` | `string` | - | Value suffix |
| `format` | `string` | - | Format: 'number', 'currency', 'percentage' |
| `trend` | `string` | - | Trend text |
| `trend-direction` | `'up' | 'down' | 'neutral'` | `'neutral'` | Trend direction |
| `icon` | `string` | - | Icon name |
| `color` | `string` | `'default'` | Color theme |
| `loading` | `boolean` | `false` | Loading state |
| `animated` | `boolean` | `false` | Enable animations |
| `clickable` | `boolean` | `false` | Make card clickable |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `event` | Card clicked |

## 📚 Next Steps

- [Form Components](/getting-started/components/form-components) - Input components
- [Display Components](/getting-started/components/display-components) - More display options
- [Layout Components](/getting-started/components/layout-components) - Layout utilities
