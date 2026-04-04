---
title: General Form
editLink: true
---

# General Form

A generic form component that provides consistent form layout, validation, and submission handling.

## Usage

```html
<general-form 
  :schema="formSchema"
  v-model="formData"
  @submit="handleSubmit"
  @cancel="handleCancel"
></general-form>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| schema | FormSchema | Required | Schema defining form fields and validation |
| modelValue | any | Required | Form data object (v-model) |
| loading | boolean | false | Loading state for submit button |
| submitText | string | 'Submit' | Text for submit button |
| cancelText | string | 'Cancel' | Text for cancel button |
| showCancel | boolean | true | Whether to show cancel button |
| layout | 'vertical' \| 'horizontal' | 'vertical' | Form layout direction |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| submit | formData | Emitted when form is submitted with valid data |
| cancel | none | Emitted when cancel button is clicked |
| validation-error | errors | Emitted when validation fails |

## Types

```typescript
interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date'
  required?: boolean
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  validation?: ValidationRule[]
  component?: string // Custom component name
  props?: Record<string, any> // Additional props for custom components
}

interface FormSchema {
  fields: FormField[]
  validation?: Record<string, ValidationRule[]>
}
```

## Features

- **Dynamic Fields**: Supports various input types and custom components
- **Validation**: Built-in validation with custom rules
- **Flexible Layout**: Vertical or horizontal form layouts
- **Loading States**: Integrated loading state for async submissions

## Examples

### Basic Form

```html
<script setup>
const formData = ref({
  name: '',
  email: '',
  role: 'user'
})

const formSchema = {
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      validation: [{ type: 'email', message: 'Invalid email format' }]
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' }
      ]
    }
  ]
}
</script>

<template>
  <general-form 
    :schema="formSchema"
    v-model="formData"
    @submit="saveUser"
  />
</template>
```

### With Custom Component

```html
<script setup>
const formSchema = {
  fields: [
    {
      name: 'avatar',
      label: 'Profile Picture',
      component: 'avatar-uploader',
      props: { maxSize: 2048 }
    },
    {
      name: 'bio',
      label: 'Biography',
      type: 'textarea',
      placeholder: 'Tell us about yourself...'
    }
  ]
}
</script>
```

---

© Velocitech LTD. All rights reserved.
