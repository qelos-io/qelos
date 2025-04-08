---
title: Content Box Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<content-box>` component is used to load and display HTML content blocks that are stored in the database. It retrieves content based on a unique identifier and renders the HTML content directly on the page.

## Usage

```html
<content-box identifier="60a6c5e45e214a001c9e72b1"></content-box>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `identifier` | String | - | MongoDB ObjectId of the content block stored in the database |

## How It Works

The `<content-box>` component works by:

1. Taking a MongoDB ObjectId as the identifier input
2. Fetching the corresponding HTML content block from the database using the blocks API
3. Rendering the retrieved HTML content directly on the page using Vue's `v-html` directive

This approach allows content to be managed and updated in the database without requiring code changes or redeployment.

## Examples

### Basic Usage

```html
<content-box identifier="60a6c5e45e214a001c9e72b1"></content-box>
```

### Multiple Content Blocks

```html
<div class="page-layout">
  <content-box identifier="60a6c5e45e214a001c9e72b1"></content-box>
  
  <div class="main-content">
    <content-box identifier="60a6c5e45e214a001c9e72b2"></content-box>
    <content-box identifier="60a6c5e45e214a001c9e72b3"></content-box>
  </div>
  
  <content-box identifier="60a6c5e45e214a001c9e72b4"></content-box>
</div>
```

### Dynamic Content Block Identifiers

```html
<template>
  <div class="dynamic-content">
    <content-box :identifier="blockId"></content-box>
  </div>
</template>
```


---

© Velocitech LTD. All rights reserved.
