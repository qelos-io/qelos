# Form Components

Qelos provides a comprehensive set of form components with built-in validation, accessibility, and consistent styling.

## 📝 form-input

Enhanced input component with validation, debouncing, and multiple input types.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const password = ref('')
</script>

<template>
  <form>
    <form-input
      v-model="name"
      label="Full Name"
      placeholder="Enter your name"
    />
    
    <form-input
      v-model="email"
      label="Email Address"
      type="email"
      placeholder="you@example.com"
    />
    
    <form-input
      v-model="password"
      label="Password"
      type="password"
      placeholder="Enter password"
    />
  </form>
</template>
```

### With Validation

```vue
<script setup>
import { ref } from 'vue'

const formData = ref({
  username: '',
  email: '',
  age: ''
})

const errors = ref({})

const validation = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-20 characters, alphanumeric and underscore only'
  },
  email: {
    required: true,
    type: 'email',
    message: 'Please enter a valid email address'
  },
  age: {
    required: true,
    type: 'number',
    min: 18,
    max: 120,
    message: 'Age must be between 18 and 120'
  }
}

const validateField = (field, value) => {
  const rules = validation[field]
  if (!rules) return true
  
  if (rules.required && !value) {
    errors.value[field] = rules.message || `${field} is required`
    return false
  }
  
  if (rules.minLength && value.length < rules.minLength) {
    errors.value[field] = `Minimum ${rules.minLength} characters required`
    return false
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.value[field] = rules.message || 'Invalid format'
    return false
  }
  
  delete errors.value[field]
  return true
}

const handleInput = (field, value) => {
  validateField(field, value)
}

const handleSubmit = () => {
  let isValid = true
  Object.keys(formData.value).forEach(field => {
    if (!validateField(field, formData.value[field])) {
      isValid = false
    }
  })
  
  if (isValid) {
    console.log('Form submitted:', formData.value)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <form-input
      v-model="formData.username"
      label="Username"
      placeholder="Choose a username"
      :validation="validation.username"
      :error="errors.username"
      @input="handleInput('username', $event)"
      debounce="300"
    />
    
    <form-input
      v-model="formData.email"
      label="Email"
      type="email"
      placeholder="your@email.com"
      :validation="validation.email"
      :error="errors.email"
      @input="handleInput('email', $event)"
    />
    
    <form-input
      v-model="formData.age"
      label="Age"
      type="number"
      placeholder="Your age"
      :validation="validation.age"
      :error="errors.age"
      @input="handleInput('age', $event)"
    />
    
    <el-button type="primary" native-type="submit">Submit</el-button>
  </form>
</template>
```

### Input Types

```vue
<script setup>
import { ref } from 'vue'

const inputs = ref({
  text: '',
  password: '',
  email: '',
  url: '',
  tel: '',
  search: '',
  number: '',
  textarea: ''
})

const showPassword = ref(false)
</script>

<template>
  <div class="input-types-demo">
    <!-- Text Input -->
    <form-input
      v-model="inputs.text"
      label="Text Input"
      placeholder="Enter text"
      clearable
    />
    
    <!-- Password Input -->
    <form-input
      v-model="inputs.password"
      label="Password"
      type="password"
      placeholder="Enter password"
      show-password-toggle
    />
    
    <!-- Email Input -->
    <form-input
      v-model="inputs.email"
      label="Email"
      type="email"
      placeholder="email@example.com"
    />
    
    <!-- URL Input -->
    <form-input
      v-model="inputs.url"
      label="Website"
      type="url"
      placeholder="https://example.com"
    />
    
    <!-- Phone Input -->
    <form-input
      v-model="inputs.tel"
      label="Phone"
      type="tel"
      placeholder="+1 (555) 123-4567"
    />
    
    <!-- Search Input -->
    <form-input
      v-model="inputs.search"
      label="Search"
      type="search"
      placeholder="Search..."
      prefix-icon="search"
    />
    
    <!-- Number Input -->
    <form-input
      v-model="inputs.number"
      label="Quantity"
      type="number"
      :min="1"
      :max="100"
      :step="1"
    />
    
    <!-- Textarea -->
    <form-input
      v-model="inputs.textarea"
      label="Message"
      type="textarea"
      placeholder="Type your message..."
      :rows="4"
      :maxlength="500"
      show-word-limit
    />
  </div>
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string/number` | - | Input value |
| `type` | `string` | `'text'` | Input type |
| `label` | `string` | - | Field label |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Read-only state |
| `clearable` | `boolean` | `false` | Show clear button |
| `show-password-toggle` | `boolean` | `false` | Show password toggle (for password type) |
| `debounce` | `number` | - | Debounce delay in ms |
| `validation` | `Object` | - | Validation rules |
| `error` | `string` | - | Error message |
| `prefix-icon` | `string` | - | Prefix icon |
| `suffix-icon` | `string` | - | Suffix icon |
| `maxlength` | `number` | - | Max character count |
| `show-word-limit` | `boolean` | `false` | Show character count |
| `rows` | `number` | - | Number of rows (for textarea) |
| `autosize` | `boolean/Object` | - | Auto resize (for textarea) |

## 📋 form-select

Advanced select component with search, multi-select, and remote options.

### Single Selection

```vue
<script setup>
import { ref } from 'vue'

const selectedCountry = ref('')

const countries = [
  { value: 'us', label: 'United States', code: '+1' },
  { value: 'uk', label: 'United Kingdom', code: '+44' },
  { value: 'fr', label: 'France', code: '+33' },
  { value: 'de', label: 'Germany', code: '+49' },
  { value: 'jp', label: 'Japan', code: '+81' }
]

const handleCountryChange = (value) => {
  console.log('Selected country:', value)
}
</script>

<template>
  <form-select
    v-model="selectedCountry"
    :options="countries"
    label="Country"
    placeholder="Select a country"
    clearable
    @change="handleCountryChange"
  />
</template>
```

### Multiple Selection

```vue
<script setup>
import { ref } from 'vue'

const selectedSkills = ref([])

const skills = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' }
]

const handleSkillsChange = (values) => {
  console.log('Selected skills:', values)
}
</script>

<template>
  <form-select
    v-model="selectedSkills"
    :options="skills"
    label="Skills"
    placeholder="Select your skills"
    multiple
    :max-tags="5"
    collapse-tags
    @change="handleSkillsChange"
  />
</template>
```

### Remote Search

```vue
<script setup>
import { ref } from 'vue'

const selectedUser = ref('')
const userOptions = ref([])
const loading = ref(false)

const searchUsers = async (query) => {
  if (!query) {
    userOptions.value = []
    return
  }
  
  loading.value = true
  try {
    const response = await fetch(`/api/users/search?q=${query}`)
    const users = await response.json()
    userOptions.value = users.map(user => ({
      value: user.id,
      label: user.name,
      email: user.email
    }))
  } finally {
    loading.value = false
  }
}

const debounceSearch = debounce(searchUsers, 300)
</script>

<template>
  <form-select
    v-model="selectedUser"
    :options="userOptions"
    label="User"
    placeholder="Search for a user"
    filterable
    remote
    :remote-method="debounceSearch"
    :loading="loading"
    clearable
  >
    <template #default="{ option }">
      <div class="user-option">
        <div class="user-name">{{ option.label }}</div>
        <div class="user-email">{{ option.email }}</div>
      </div>
    </template>
  </form-select>
</template>

<style scoped>
.user-option {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 12px;
  color: var(--qelos-text-secondary);
}
</style>
```

### Grouped Options

```vue
<script setup>
import { ref } from 'vue'

const selectedOption = ref('')

const groupedOptions = [
  {
    label: 'Frontend',
    options: [
      { value: 'vue', label: 'Vue.js' },
      { value: 'react', label: 'React' },
      { value: 'angular', label: 'Angular' }
    ]
  },
  {
    label: 'Backend',
    options: [
      { value: 'node', label: 'Node.js' },
      { value: 'express', label: 'Express' },
      { value: 'fastify', label: 'Fastify' }
    ]
  },
  {
    label: 'Database',
    options: [
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' }
    ]
  }
]
</script>

<template>
  <form-select
    v-model="selectedOption"
    :options="groupedOptions"
    label="Technology Stack"
    placeholder="Select technology"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `any` | - | Selected value(s) |
| `options` | `Array` | `[]` | Options array |
| `label` | `string` | - | Field label |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `clearable` | `boolean` | `false` | Show clear button |
| `filterable` | `boolean` | `false` | Enable search |
| `multiple` | `boolean` | `false` | Multiple selection |
| `remote` | `boolean` | `false` | Remote search |
| `remote-method` | `Function` | - | Remote search method |
| `loading` | `boolean` | `false` | Loading state |
| `collapse-tags` | `boolean` | `false` | Collapse tags in multiple mode |
| `max-tags` | `number` | - | Max tags to show |
| `no-data-text` | `string` | `'No data'` | Text when no options |

## 📅 form-date-picker

Flexible date picker with multiple modes and shortcuts.

### Single Date

```vue
<script setup>
import { ref } from 'vue'

const birthDate = ref('')
const appointmentDate = ref('')

const shortcuts = [
  {
    text: 'Today',
    value: new Date()
  },
  {
    text: 'Tomorrow',
    value: () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      return date
    }
  },
  {
    text: 'Next Week',
    value: () => {
      const date = new Date()
      date.setDate(date.getDate() + 7)
      return date
    }
  }
]

const disabledDate = (date) => {
  // Disable dates in the past
  return date < new Date(new Date().setHours(0, 0, 0, 0))
}

const handleDateChange = (date) => {
  console.log('Selected date:', date)
}
</script>

<template>
  <form-date-picker
    v-model="birthDate"
    label="Birth Date"
    type="date"
    placeholder="Select date"
    :shortcuts="shortcuts"
    :disabled-date="disabledDate"
    @change="handleDateChange"
  />
  
  <form-date-picker
    v-model="appointmentDate"
    label="Appointment"
    type="datetime"
    placeholder="Select date and time"
    format="YYYY-MM-DD HH:mm"
    value-format="YYYY-MM-DD HH:mm:ss"
  />
</template>
```

### Date Range

```vue
<script setup>
import { ref } from 'vue'

const dateRange = ref([])
const bookingDates = ref([])

const rangeShortcuts = [
  {
    text: 'Last 7 days',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    }
  },
  {
    text: 'Last 30 days',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return [start, end]
    }
  },
  {
    text: 'This Month',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(1)
      return [start, end]
    }
  }
]

const handleRangeChange = (dates) => {
  if (dates) {
    console.log('Date range:', dates[0], 'to', dates[1])
  }
}
</script>

<template>
  <form-date-picker
    v-model="dateRange"
    label="Report Period"
    type="daterange"
    placeholder="Select date range"
    :shortcuts="rangeShortcuts"
    @change="handleRangeChange"
  />
  
  <form-date-picker
    v-model="bookingDates"
    label="Booking Dates"
    type="datetimerange"
    placeholder="Select booking period"
    format="YYYY-MM-DD HH:mm"
    value-format="YYYY-MM-DD HH:mm:ss"
    :default-time="[
      new Date(2000, 1, 1, 0, 0, 0),
      new Date(2000, 1, 1, 23, 59, 59)
    ]"
  />
</template>
```

### Month and Year Picker

```vue
<script setup>
import { ref } from 'vue'

const selectedMonth = ref('')
const selectedYear = ref('')
const selectedQuarter = ref('')
</script>

<template>
  <form-date-picker
    v-model="selectedMonth"
    label="Select Month"
    type="month"
    placeholder="Select month"
    format="YYYY-MM"
  />
  
  <form-date-picker
    v-model="selectedYear"
    label="Select Year"
    type="year"
    placeholder="Select year"
  />
  
  <form-date-picker
    v-model="selectedQuarter"
    label="Select Quarter"
    type="quarter"
    placeholder="Select quarter"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Date/Array` | - | Selected date(s) |
| `type` | `string` | `'date'` | Picker type: date, datetime, daterange, datetimerange, month, year, quarter |
| `label` | `string` | - | Field label |
| `placeholder` | `string` | - | Placeholder text |
| `format` | `string` | - | Display format |
| `value-format` | `string` | - | Value format |
| `disabled-date` | `Function` | - | Function to disable dates |
| `shortcuts` | `Array` | - | Quick selection shortcuts |
| `disabled` | `boolean` | `false` | Disabled state |
| `clearable` | `boolean` | `false` | Show clear button |
| `editable` | `boolean` | `true` | Allow manual input |
| `default-time` | `Date/Array` | - | Default time for datetime |

## 🔄 form-switch

Toggle switch for boolean values with custom styling.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const settings = ref({
  notifications: true,
  darkMode: false,
  autoSave: true,
  publicProfile: false
})

const handleSwitchChange = (key, value) => {
  console.log(`${key} changed to:`, value)
}
</script>

<template>
  <div class="switches">
    <form-switch
      v-model="settings.notifications"
      label="Email Notifications"
      description="Receive email updates about your account"
      @change="handleSwitchChange('notifications', $event)"
    />
    
    <form-switch
      v-model="settings.darkMode"
      label="Dark Mode"
      description="Use dark theme across the application"
    />
    
    <form-switch
      v-model="settings.autoSave"
      label="Auto Save"
      description="Automatically save your work every 5 minutes"
    />
    
    <form-switch
      v-model="settings.publicProfile"
      label="Public Profile"
      description="Make your profile visible to other users"
    />
  </div>
</template>
```

### Custom Text and Icons

```vue
<script setup>
import { ref } from 'vue'

const isActive = ref(true)
const subscription = ref('monthly')
</script>

<template>
  <form-switch
    v-model="isActive"
    active-text="Enabled"
    inactive-text="Disabled"
    active-value="enabled"
    inactive-value="disabled"
  />
  
  <form-switch
    v-model="subscription"
    active-text="Monthly"
    inactive-text="Yearly"
    active-value="monthly"
    inactive-value="yearly"
    active-icon="calendar"
    inactive-icon="calendar-alt"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `any` | - | Switch value |
| `label` | `string` | - | Switch label |
| `description` | `string` | - | Description text |
| `disabled` | `boolean` | `false` | Disabled state |
| `active-text` | `string` | - | Text when active |
| `inactive-text` | `string` | - | Text when inactive |
| `active-value` | `any` | `true` | Value when active |
| `inactive-value` | `any` | `false` | Value when inactive |
| `active-icon` | `string` | - | Icon when active |
| `inactive-icon` | `string` | - | Icon when inactive |
| `size` | `string` | `'default'` | Size: small, default, large |

## 📝 form-rich-text

Rich text editor with formatting options and image upload.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const content = ref('<p>Hello <strong>World</strong>!</p>')

const handleContentChange = (html) => {
  console.log('Content changed:', html)
}
</script>

<template>
  <form-rich-text
    v-model="content"
    label="Content"
    placeholder="Start typing..."
    @change="handleContentChange"
  />
</template>
```

### Custom Toolbar

```vue
<script setup>
import { ref } from 'vue'

const content = ref('')

const toolbar = [
  'bold', 'italic', 'underline', 'strikethrough',
  '|',
  'heading-1', 'heading-2', 'heading-3',
  '|',
  'bullet-list', 'numbered-list', 'check-list',
  '|',
  'quote', 'code-block',
  '|',
  'link', 'image',
  '|',
  'text-color', 'background-color',
  '|',
  'align-left', 'align-center', 'align-right',
  '|',
  'undo', 'redo'
]

const handleImageUpload = async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  })
  
  const result = await response.json()
  return result.url
}

const handleImageError = (error) => {
  console.error('Image upload failed:', error)
  ElMessage.error('Failed to upload image')
}
</script>

<template>
  <form-rich-text
    v-model="content"
    label="Article Content"
    :toolbar="toolbar"
    :image-upload="handleImageUpload"
    @image-error="handleImageError"
    :max-length="10000"
    show-word-count
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | - | Editor content |
| `label` | `string` | - | Field label |
| `placeholder` | `string` | - | Placeholder text |
| `toolbar` | `Array` | - | Toolbar items |
| `image-upload` | `Function` | - | Image upload handler |
| `max-length` | `number` | - | Maximum character count |
| `show-word-count` | `boolean` | `false` | Show word count |
| `disabled` | `boolean` | `false` | Disabled state |
| `height` | `string/number` | `'300px'` | Editor height |

## 📎 form-upload

File upload component with drag-and-drop, progress tracking, and preview.

### Basic Upload

```vue
<script setup>
import { ref } from 'vue'

const files = ref([])

const handleSuccess = (response, file) => {
  console.log('Upload successful:', response, file)
}

const handleError = (error, file) => {
  console.error('Upload failed:', error)
}

const handleRemove = (file) => {
  console.log('File removed:', file)
}
</script>

<template>
  <form-upload
    v-model="files"
    label="Documents"
    action="/api/upload"
    :on-success="handleSuccess"
    :on-error="handleError"
    :on-remove="handleRemove"
  />
</template>
```

### Advanced Upload

```vue
<script setup>
import { ref } from 'vue'

const files = ref([])
const fileList = ref([])

const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  // Add additional data
  formData.append('folder', 'documents')
  formData.append('userId', '123')
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Upload failed')
  }
  
  return response.json()
}

const beforeUpload = (file) => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('Only JPEG, PNG, and PDF files are allowed')
    return false
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('File size must be less than 10MB')
    return false
  }
  
  return true
}

const handleProgress = (event, file) => {
  console.log(`Upload progress: ${event.percent}%`)
}

const handlePreview = (file) => {
  if (file.url) {
    window.open(file.url, '_blank')
  }
}
</script>

<template>
  <form-upload
    v-model="files"
    v-model:file-list="fileList"
    label="Upload Files"
    :upload="uploadFile"
    :before-upload="beforeUpload"
    multiple
    drag
    :limit="5"
    :file-size="10"
    file-size-unit="MB"
    accept=".jpg,.jpeg,.png,.pdf"
    list-type="picture-card"
    @progress="handleProgress"
    @preview="handlePreview"
  >
    <template #tip>
      <div class="upload-tip">
        <p>Drag files here or <em>click to upload</em></p>
        <p>Maximum 5 files, 10MB each (JPG, PNG, PDF)</p>
      </div>
    </template>
    
    <template #empty>
      <div class="upload-empty">
        <upload-icon size="48" />
        <p>Drop files here to upload</p>
      </div>
    </template>
  </form-upload>
</template>

<style scoped>
.upload-tip {
  font-size: 12px;
  color: var(--qelos-text-secondary);
  text-align: center;
  margin-top: 10px;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--qelos-text-placeholder);
}
</style>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Array` | - | Uploaded files |
| `action` | `string` | - | Upload URL |
| `upload` | `Function` | - | Custom upload function |
| `before-upload` | `Function` | - | Before upload hook |
| `multiple` | `boolean` | `false` | Multiple files |
| `drag` | `boolean` | `false` | Drag and drop |
| `limit` | `number` | - | Max file count |
| `file-size` | `number` | - | Max file size |
| `file-size-unit` | `string` | `'B'` | Size unit |
| `accept` | `string` | - | Accepted file types |
| `list-type` | `string` | `'text'` | List type: text, picture, picture-card |

## 📚 Next Steps

- [Data Components](/getting-started/components/data-components) - Table and grid components
- [Display Components](/getting-started/components/display-components) - Cards and badges
- [Layout Components](/getting-started/components/layout-components) - Layout utilities
