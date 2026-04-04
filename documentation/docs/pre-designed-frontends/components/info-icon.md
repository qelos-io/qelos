---
title: Info Icon
editLink: true
---

# Info Icon

An icon component that displays additional information in a tooltip when hovered or clicked.

## Usage

```html
<info-icon content="This field is required for validation">
</info-icon>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | string | Required | The information to display in the tooltip |
| icon | string | 'info' | The icon name to display |
| placement | 'top' \| 'bottom' \| 'left' \| 'right' | 'top' | Tooltip placement |
| trigger | 'hover' \| 'click' | 'hover' | How to trigger the tooltip |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Icon size |

## Features

- **Flexible Content**: Supports any text content in the tooltip
- **Multiple Triggers**: Can show tooltip on hover or click
- **Placement Options**: Control where the tooltip appears
- **Customizable Icon**: Can use different icons besides the default info icon

## Examples

### Basic Usage

```html
<label>
  Email Address
  <info-icon content="We'll never share your email with third parties">
  </info-icon>
</label>
```

### Custom Placement and Trigger

```html
<info-icon 
  content="Complex validation rules apply here"
  placement="right"
  trigger="click"
  icon="question"
></info-icon>
```

### With Form Field

```html
<el-form-item label="Password">
  <el-input v-model="password" type="password" />
  <info-icon 
    content="Password must be at least 8 characters with uppercase, lowercase, and numbers"
    placement="right"
  />
</el-form-item>
```

---

© Velocitech LTD. All rights reserved.
