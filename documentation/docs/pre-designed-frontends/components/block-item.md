---
title: Block Item
editLink: true
---

# Block Item

A container component designed to wrap and display content blocks with consistent styling and layout.

## Usage

```html
<block-item title="User Information" :collapsible="true">
  <p>Content goes here...</p>
</block-item>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | '' | Optional title for the block |
| collapsible | boolean | false | Whether the block can be collapsed |
| collapsed | boolean | false | Initial collapsed state |
| padding | string | 'default' | Padding size: 'none', 'small', 'default', 'large' |
| border | boolean | true | Whether to show border |
| shadow | boolean | false | Whether to show shadow |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| collapse | boolean | Emitted when block is collapsed/expanded |

## Features

- **Consistent Styling**: Provides uniform appearance for content blocks
- **Collapsible**: Optional collapse/expand functionality
- **Flexible Padding**: Multiple padding options for different use cases
- **Title Support**: Optional title header for the block

## Examples

### Basic Block Item

```html
<block-item>
  <div class="user-profile">
    <img :src="user.avatar" />
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
  </div>
</block-item>
```

### With Title and Collapse

```html
<block-item 
  title="Advanced Settings"
  :collapsible="true"
  v-model:collapsed="settingsCollapsed"
>
  <el-form>
    <el-form-item label="API Key">
      <el-input v-model="apiKey" type="password" />
    </el-form-item>
    <el-form-item label="Webhook URL">
      <el-input v-model="webhookUrl" />
    </el-form-item>
  </el-form>
</block-item>
```

### Custom Padding

```html
<block-item padding="large" :shadow="true">
  <chart-container :data="chartData" />
</block-item>
```

---

© Velocitech LTD. All rights reserved.
