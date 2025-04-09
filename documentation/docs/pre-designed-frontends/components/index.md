---
title: Template Ecosystem Components
editLink: true
---

# {{ $frontmatter.title }}

## Overview

Qelos provides a rich set of pre-designed components that you can use in your templates. These components are designed to be used as native HTML tags in kebab-case format and must have closing tags.

All components are globally registered and can be used directly in your templates without importing them.

## Available Components

Here's a list of available components in the Qelos template ecosystem:

### Documented Components

The following components have detailed documentation:

- [Form Input](./form-input.md) - Input component for forms
- [Form Row Group](./form-row-group.md) - Group form inputs in rows
- [Save Button](./save-button.md) - Button for saving forms
- [Monaco](./monaco.md) - Code editor component
- [Quick Table](./quick-table.md) - Simplified table component
- [V Chart](./v-chart.md) - Chart visualization component
- [Content Box](./content-box.md) - Component that loads HTML content blocks from the database
- [Copy To Clipboard](./copy-to-clipboard.md) - Button to copy content to clipboard
- [Empty State](./empty-state.md) - Component for empty state display
- [Life Cycle](./life-cycle.md) - Component for displaying lifecycle stages

### Other Available Components

The following components are also available in the Qelos template ecosystem (documentation coming soon):

- Edit Header - Header for edit pages
- Info Icon - Icon with tooltip information
- Block Item - Block container for content
- List Page Title - Title component for list pages
- General Form - Generic form component
- Blueprint Entity Form - Form for blueprint entities
- Confirm Message - Confirmation dialog component
- Remove Button - Button for deletion actions
- Editable Content - Content that can be edited inline
- Remove Confirmation - Confirmation dialog for delete actions
- Stats Card - Card for displaying statistics
- Q Pre - Pre-formatted text component
- Q Rating - Rating component

## Using Components

All components must be used with kebab-case naming and must have closing tags. For example:

```html
<form-input label="Name" v-model="name"></form-input>
<save-button @click="saveData"></save-button>
<content-box title="User Information">Content goes here</content-box>
```

## Directives

In addition to components, the following directives are available:

- `v-loading` - Adds loading state to an element

Example usage:

```html
<div v-loading="isLoading">Content that will show loading state</div>
```

---

© Velocitech LTD. All rights reserved.
