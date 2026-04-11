---
title: List Page Title
editLink: true
---

# List Page Title

A title component specifically designed for list pages, providing page title, description, and action buttons.

## Usage

```html
<list-page-title 
  title="All Users"
  description="Manage your application users"
  :action-buttons="actions"
></list-page-title>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | Required | The main page title |
| description | string | '' | Optional description text |
| actionButtons | `Array<ActionButton>` | [] | Array of action buttons to display |
| showBreadcrumb | boolean | true | Whether to show breadcrumb navigation |
| breadcrumbItems | `Array<BreadcrumbItem>` | [] | Breadcrumb items |

## Types

```typescript
interface ActionButton {
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  handler: () => void
  loading?: boolean
  disabled?: boolean
}
```

## Features

- **Page Context**: Clear title and optional description for the page
- **Action Buttons**: Support for multiple action buttons with different styles
- **Breadcrumb Integration**: Built-in breadcrumb navigation support
- **Responsive Layout**: Adapts to different screen sizes

## Examples

### Basic List Page Title

```html
<list-page-title 
  title="Products"
  description="Manage your product catalog"
></list-page-title>
```

### With Action Buttons

```html
<list-page-title 
  title="Orders"
  description="View and manage customer orders"
  :action-buttons="[
    {
      text: 'New Order',
      type: 'primary',
      icon: 'plus',
      handler: () => showCreateOrder = true
    },
    {
      text: 'Export',
      type: 'default',
      icon: 'download',
      handler: exportOrders
    }
  ]"
></list-page-title>
```

### With Breadcrumbs

```html
<list-page-title 
  title="User Settings"
  :breadcrumb-items="[
    { text: 'Dashboard', to: '/' },
    { text: 'Settings', to: '/settings' },
    { text: 'Users' }
  ]"
></list-page-title>
```

---

© Velocitech LTD. All rights reserved.
