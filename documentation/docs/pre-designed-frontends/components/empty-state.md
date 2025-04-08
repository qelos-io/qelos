---
title: Empty State Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<empty-state>` component provides a standardized way to display empty state messages when there is no data to show. It helps provide a better user experience by explaining why content is missing and often suggesting actions to take.

## Usage

```html
<empty-state 
  title="No Projects Found" 
  description="You haven't created any projects yet." 
  icon="el-icon-folder"
></empty-state>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | 'No Data' | Main title text |
| `description` | String | - | Descriptive text explaining the empty state |
| `icon` | String | 'el-icon-document' | Icon to display above the title |
| `image` | String | - | Custom image URL to display instead of an icon |
| `imageSize` | Number | 100 | Size of the image in pixels |
| `buttonText` | String | - | Text for the action button (if needed) |
| `buttonType` | String | 'primary' | Type of the action button (primary, success, warning, etc.) |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `action` | - | Emitted when the action button is clicked |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Custom content to replace the default empty state content |
| `image` | Custom content for the image/icon area |
| `title` | Custom content for the title area |
| `description` | Custom content for the description area |
| `action` | Custom content for the action area |

## Examples

### Basic Usage

```html
<empty-state 
  title="No Results Found" 
  description="Try adjusting your search criteria."
></empty-state>
```

### With Action Button

```html
<empty-state 
  title="Your Cart is Empty" 
  description="Add some products to your cart to continue shopping." 
  button-text="Browse Products"
  @action="navigateToProducts"
></empty-state>
```

### With Custom Image

```html
<empty-state 
  title="No Notifications" 
  description="You don't have any notifications at the moment." 
  image="/images/empty-notifications.svg"
  :image-size="150"
></empty-state>
```

### With Custom Content

```html
<empty-state>
  <template #image>
    <img src="/images/custom-empty.svg" alt="Empty state" />
  </template>
  
  <template #title>
    <h3 class="custom-title">Nothing to see here</h3>
  </template>
  
  <template #description>
    <p class="custom-description">This section is currently empty.</p>
    <p class="custom-hint">Check back later for updates.</p>
  </template>
  
  <template #action>
    <el-button type="success" @click="refresh">Refresh</el-button>
    <el-button @click="goBack">Go Back</el-button>
  </template>
</empty-state>
```

### In a Content Box

```html
<content-box title="User Activity">
  <empty-state 
    title="No Activity Yet" 
    description="This user hasn't performed any actions yet."
    icon="el-icon-time"
  ></empty-state>
</content-box>
```

---

u00a9 Velocitech LTD. All rights reserved.
