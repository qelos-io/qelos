---
title: Save Button Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<save-button>` component provides a standardized button for saving forms and data in the Qelos template ecosystem. It includes built-in loading states and consistent styling across the application.

## Usage

```html
<save-button @click="saveData" :loading="isSaving"></save-button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | Boolean | false | Whether the button is in a loading state |
| `disabled` | Boolean | false | Whether the button is disabled |
| `type` | String | 'primary' | Button type (primary, success, warning, danger, info) |
| `size` | String | 'default' | Button size (large, default, small) |
| `text` | String | 'Save' | Button text |
| `icon` | String | 'el-icon-check' | Icon to display next to text |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `click` | (event: MouseEvent) | Emitted when the button is clicked |

## Examples

### Basic Usage

```html
<save-button @click="saveForm"></save-button>
```

### With Custom Text

```html
<save-button text="Submit" @click="submitForm"></save-button>
```

### With Loading State

```html
<save-button :loading="isSubmitting" @click="submitWithLoading"></save-button>
```

### Different Button Types

```html
<save-button type="success" text="Approve" @click="approveItem"></save-button>
<save-button type="danger" text="Reject" @click="rejectItem"></save-button>
```

### With Different Sizes

```html
<save-button size="large" text="Save All Changes" @click="saveAllChanges"></save-button>
<save-button size="small" text="Quick Save" @click="quickSave"></save-button>
```

---

© Velocitech LTD. All rights reserved.
