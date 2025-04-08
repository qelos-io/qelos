---
title: Form Input Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<form-input>` component provides a standardized input field for forms in the Qelos template ecosystem. It wraps the Element Plus input components with additional functionality and styling consistent with the Qelos design system.

## Usage

```html
<form-input
  label="Username"
  v-model="username"
  placeholder="Enter your username"
  required
></form-input>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | - | Label text for the input field |
| `modelValue` | Any | - | The value of the input (use with v-model) |
| `placeholder` | String | - | Placeholder text when input is empty |
| `required` | Boolean | false | Whether the field is required |
| `disabled` | Boolean | false | Whether the input is disabled |
| `type` | String | 'text' | Input type (text, password, number, etc.) |
| `clearable` | Boolean | false | Whether the input can be cleared |
| `showPassword` | Boolean | false | Whether to show password toggle for password fields |
| `error` | String | - | Error message to display |
| `hint` | String | - | Hint text to display below the input |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `update:modelValue` | (value: any) | Emitted when the input value changes |
| `focus` | (event: FocusEvent) | Emitted when the input is focused |
| `blur` | (event: FocusEvent) | Emitted when the input loses focus |
| `change` | (value: any) | Emitted when the input value changes and loses focus |

## Examples

### Basic Usage

```html
<form-input
  label="Email"
  v-model="email"
  placeholder="Enter your email"
  required
></form-input>
```

### With Error Message

```html
<form-input
  label="Password"
  v-model="password"
  type="password"
  show-password
  :error="passwordError"
></form-input>
```

### With Hint Text

```html
<form-input
  label="API Key"
  v-model="apiKey"
  hint="Your API key can be found in your account settings"
></form-input>
```

### Disabled Input

```html
<form-input
  label="Username"
  v-model="username"
  disabled
></form-input>
```

---

© Velocitech LTD. All rights reserved.
