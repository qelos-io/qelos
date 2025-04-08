---
title: Quick Table Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<quick-table>` component provides a simplified way to display tabular data in the Qelos template ecosystem. It wraps the Element Plus table with additional functionality for common use cases like pagination, sorting, and filtering.

## Usage

```html
<quick-table :data="tableData" :columns="tableColumns"></quick-table>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | [] | Array of objects to display in the table |
| `columns` | Array | [] | Configuration for table columns |
| `loading` | Boolean | false | Whether the table is in a loading state |
| `pagination` | Boolean | true | Whether to show pagination |
| `pageSize` | Number | 10 | Number of rows per page |
| `pageSizes` | Array | [10, 20, 50, 100] | Available page size options |
| `stripe` | Boolean | true | Whether to apply stripe style to rows |
| `border` | Boolean | false | Whether to show vertical borders |
| `height` | String/Number | - | Table height, can be a number or CSS value |
| `maxHeight` | String/Number | - | Maximum table height |
| `emptyText` | String | 'No Data' | Text to display when there is no data |

## Column Configuration

Each column in the `columns` array should be an object with the following properties:

```javascript
{
  prop: 'fieldName',       // Property name in data objects
  label: 'Display Label',  // Column header text
  width: '120px',          // Column width (optional)
  sortable: true,          // Whether column is sortable (optional)
  formatter: (row) => row.fieldName.toUpperCase(), // Custom formatter function (optional)
  align: 'center',         // Text alignment (left, center, right) (optional)
  fixed: true,             // Whether column is fixed (optional)
  className: 'custom-class' // Custom CSS class for the column (optional)
}
```

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `row-click` | (row, column, event) | Emitted when a row is clicked |
| `selection-change` | (selection) | Emitted when selection changes (if selectable) |
| `sort-change` | (column, prop, order) | Emitted when sorting changes |
| `page-change` | (page) | Emitted when current page changes |
| `page-size-change` | (size) | Emitted when page size changes |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Custom content for the table |
| `empty` | Custom content when table is empty |
| `append` | Content to append after the last row |
| `[column-prop]` | Custom cell content for a specific column |
| `[column-prop]-header` | Custom header content for a specific column |

## Examples

### Basic Usage

```html
<quick-table :data="users" :columns="[
  { prop: 'name', label: 'Name' },
  { prop: 'email', label: 'Email' },
  { prop: 'role', label: 'Role' }
]"></quick-table>
```

### With Custom Column Formatting

```html
<quick-table :data="products" :columns="[
  { prop: 'name', label: 'Product Name' },
  { prop: 'price', label: 'Price', formatter: (row) => `$${row.price.toFixed(2)}` },
  { prop: 'status', label: 'Status' }
]"></quick-table>
```

### With Custom Cell Templates

```html
<quick-table :data="users" :columns="[
  { prop: 'name', label: 'Name' },
  { prop: 'email', label: 'Email' },
  { prop: 'actions', label: 'Actions', width: '120px' }
]">
  <template #actions="{ row }">
    <el-button size="small" @click="editUser(row)">Edit</el-button>
    <el-button size="small" type="danger" @click="deleteUser(row)">Delete</el-button>
  </template>
</quick-table>
```

### With Pagination and Loading State

```html
<quick-table 
  :data="tableData" 
  :columns="tableColumns" 
  :loading="isLoading"
  :pagination="true"
  :page-size="20"
  @page-change="loadPage"
></quick-table>
```

---

u00a9 Velocitech LTD. All rights reserved.
