---
title: Edit Header
editLink: true
---

# Edit Header

A header component specifically designed for edit pages, providing navigation and context information.

## Usage

```html
<edit-header 
  title="Edit User"
  :breadcrumb-items="breadcrumbItems"
  :show-save="true"
  @save="handleSave"
  @cancel="handleCancel"
></edit-header>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | Required | The main title displayed in the header |
| breadcrumbItems | `Array<BreadcrumbItem>` | [] | Array of breadcrumb items for navigation |
| showSave | boolean | false | Whether to show the save button |
| showCancel | boolean | true | Whether to show the cancel button |
| saveText | string | 'Save' | Text for the save button |
| cancelText | string | 'Cancel' | Text for the cancel button |
| loading | boolean | false | Loading state for the save button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| save | none | Emitted when the save button is clicked |
| cancel | none | Emitted when the cancel button is clicked |

## Features

- **Breadcrumb Navigation**: Supports multi-level breadcrumb navigation
- **Action Buttons**: Configurable save and cancel buttons
- **Loading States**: Built-in loading state for async operations
- **Responsive Design**: Adapts to different screen sizes

## Examples

### Basic Edit Header

```html
<edit-header 
  title="Edit Product"
  @save="saveProduct"
  @cancel="goBack"
></edit-header>
```

### With Breadcrumbs

```html
<edit-header 
  title="Edit User"
  :breadcrumb-items="[
    { text: 'Dashboard', to: '/dashboard' },
    { text: 'Users', to: '/users' },
    { text: 'Edit' }
  ]"
  :show-save="true"
  :loading="saving"
  @save="saveUser"
  @cancel="navigateToUsers"
></edit-header>
```

---

© Velocitech LTD. All rights reserved.
