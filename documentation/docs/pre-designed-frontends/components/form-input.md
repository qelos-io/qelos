---
title: Form Input Component
editLink: true
---
# Form Input Component

## Overview

The `<form-input>` component provides a standardized input field for forms in the Qelos template ecosystem. It wraps the Element Plus input components with additional functionality and styling consistent with the Qelos design system.

This component includes enhanced user experience features such as validation, input masking, tooltips, animations, and responsive design to create intuitive and user-friendly forms.

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

### Basic Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | - | The label for the input field |
| `label` | String | - | Additional label text (shown in parentheses) |
| `modelValue` | Any | - | The value of the input (use with v-model) |
| `placeholder` | String | - | Placeholder text when input is empty |
| `required` | Boolean | false | Whether the field is required |
| `disabled` | Boolean | false | Whether the input is disabled |
| `type` | String | 'text' | Input type (text, textarea, password, number, select, switch, color, file, upload, icon, etc.) |
| `clearable` | Boolean | true | Whether the input can be cleared |
| `size` | String | 'large' | Size of the input (large, default, small) |
| `loading` | Boolean | false | Whether the input is in loading state |

### Validation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rules` | Object/Array | - | Validation rules object or array of rule objects |
| `validationTrigger` | String | 'blur' | When to trigger validation (blur, change) |
| `showValidationSuccess` | Boolean | false | Whether to show success indicator when validation passes |
| `validationSuccessMessage` | String | 'Valid input' | Custom message to show when validation passes |
| `validateOnMount` | Boolean | false | Whether to validate the input when component mounts |

### Help and Guidance Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `helpText` | String | - | Help text shown below the input |
| `description` | String | - | Additional description text |
| `tooltip` | String | - | Tooltip text shown in popover when clicking the info icon |
| `tooltipSimple` | String | - | Tooltip text shown on hover of info icon |
| `tooltipEffect` | String | 'light' | Tooltip effect (light, dark) |
| `helpContent` | String | - | Rich HTML content for help popover |
| `helpPopoverWidth` | Number | 300 | Width of the help popover in pixels |

### Text Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxlength` | Number | - | Maximum length of text input |
| `showCharCount` | Boolean | false | Whether to show character counter |
| `showPasswordToggle` | Boolean | true | For password fields, whether to show the toggle button |

### Number Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `min` | Number | - | Minimum value |
| `max` | Number | - | Maximum value |
| `step` | Number | 1 | Step increment |
| `precision` | Number | - | Decimal precision |

### Select Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | Array | - | Options for select dropdown |
| `optionValue` | String | - | Property name for option value |
| `optionLabel` | String | - | Property name for option label |
| `selectOptions` | Object | {} | Additional options for el-select |

### Input Masking Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mask` | String | - | Custom mask pattern (e.g., '###-##-####' for SSN) |
| `maskHint` | String | - | Hint text shown in the input to indicate format |
| `maskPlaceholder` | String | '_' | Character used for unfilled mask positions |
| `maskPreserve` | Boolean | false | Whether to preserve mask characters in the value |
| `maskPreset` | String | - | Predefined mask type (phone, date, time, credit-card, etc.) |

### Icon and Decoration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `prefixIcon` | String | - | Icon component name to show as prefix |
| `suffixIcon` | String | - | Icon component name to show as suffix |
| `prepend` | String | - | Text to prepend to input |
| `append` | String | - | Text to append to input |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `update:modelValue` | (value: any) | Emitted when the input value changes |
| `input` | (event) | Native input event |
| `change` | (event) | Native change event |
| `focus` | (event: FocusEvent) | Emitted when the input is focused |
| `blur` | (event: FocusEvent) | Emitted when the input loses focus |
| `validate` | (isValid: boolean) | Emitted after validation with result |

## Slots

| Slot | Description |
|------|-------------|
| `pre` | Content to insert before the input |
| `prefix` | Content for input prefix area |
| `suffix` | Content for input suffix area |
| `prepend` | Content to prepend to input |
| `append` | Content to append to input |
| `options` | Custom options for select input |
| `default` | Additional content after the input |

## Examples

### Basic Usage

```html
<form-input
  title="Email"
  v-model="email"
  placeholder="Enter your email"
  required
></form-input>
```

### With Validation

```html
<form-input
  title="Email Address"
  v-model="email"
  type="email"
  placeholder="Enter your email"
  :rules="{
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Please enter a valid email address'
  }"
  helpText="We'll never share your email with anyone else."
></form-input>
```

### With Rich Help Content

```html
<form-input
  title="API Key"
  v-model="apiKey"
  :helpContent="`<h4>Where to find your API Key</h4>
  <p>You can find your API key in your account settings:</p>
  <ol>
    <li>Log in to your account</li>
    <li>Go to Settings > API</li>
    <li>Click 'Generate New Key'</li>
  </ol>`"
  helpText="Enter the API key provided by the service"
></form-input>
```

### With Input Masking

```html
<form-input
  title="Phone Number"
  v-model="phoneNumber"
  mask="+1 (###) ###-####"
  maskHint="Format: +1 (555) 555-5555"
  placeholder="Enter phone number"
></form-input>
```

### Using Mask Presets

```html
<form-input
  title="Credit Card"
  v-model="creditCard"
  maskPreset="credit-card"
  maskHint="Format: XXXX XXXX XXXX XXXX"
></form-input>
```

### With Icons

```html
<form-input
  title="Search"
  v-model="search"
  prefixIcon="Search"
  placeholder="Search..."
  clearable
></form-input>
```

### Number Input with Min/Max

```html
<form-input
  title="Quantity"
  v-model="quantity"
  type="number"
  :min="1"
  :max="100"
  :step="1"
></form-input>
```

### Password with Toggle

```html
<form-input
  title="Password"
  v-model="password"
  type="password"
  showPasswordToggle
  :rules="{ required: true, min: 8 }"
  helpText="Password must be at least 8 characters long"
></form-input>
```

### Text Input with Character Counter

```html
<form-input
  title="Bio"
  v-model="bio"
  type="textarea"
  :maxlength="200"
  showCharCount
  placeholder="Tell us about yourself"
></form-input>
```

### Select with Options

```html
<form-input
  title="Country"
  v-model="country"
  type="select"
  :options="countries"
  optionValue="code"
  optionLabel="name"
  placeholder="Select a country"
></form-input>
```

## Form Group Component

The FormGroup component is designed to work with FormInput to group related fields together.

### Basic Usage

```html
<form-group label="Contact Information" direction="row">
  <form-input v-model="firstName" title="First Name" />
  <form-input v-model="lastName" title="Last Name" />
  <form-input v-model="email" title="Email" type="email" />
</form-group>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | - | Group label |
| `tooltip` | String | - | Tooltip for the group |
| `helpText` | String | - | Help text for the group |
| `direction` | String | 'row' | Layout direction (row, column) |
| `labelPosition` | String | 'top' | Label position (top, side) |
| `bordered` | Boolean | false | Whether to show a border around the group |
| `compact` | Boolean | false | Whether to use compact spacing |
| `id` | String | - | ID for the group |

### Example with Form Group

```html
<form-group label="Shipping Address" tooltip="Where should we ship your order?" bordered>
  <form-input v-model="address.street" title="Street Address" />
  <form-group direction="row">
    <form-input v-model="address.city" title="City" />
    <form-input v-model="address.state" title="State" type="select" :options="states" />
    <form-input v-model="address.zip" title="ZIP Code" mask="#####" />
  </form-group>
</form-group>
```

---

© Velocitech LTD. All rights reserved.
