---
title: Plain Template
editLink: true
---
# Plain Template

## Overview

The Plain template provides a blank canvas for creating custom pages in Qelos. It allows you to insert any valid Vue 3 template content while having access to all pre-integrated UI components and features.

## Available Components

You can use any of these pre-integrated components in your template:

- **Element Plus**: Full suite of Element Plus components (e.g., `el-button`, `el-table`, `el-form`)
- **PrimeVue**: All PrimeVue components (e.g., `p-datatable`, `p-calendar`)
- **Font Awesome**: Icons via `<i class="fas fa-*">`

## Template Variables

The following variables are automatically available in your template:

- <code v-pre>{{ myRequirementName.result }}</code> - Data loaded from your configured API endpoints
- <code v-pre>{{ $t('key') }}</code> - Translations (via vue-i18n)
- <code v-pre>{{ myRequirementName.loading }}</code> - Loading state for API requests

## Examples

### Basic Layout

```vue
<template>
  <el-container>
    <el-header>
      <h1>{{ $t('page.title') }}</h1>
    </el-header>
    <el-main>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <!-- Your content here -->
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>
```

### Data Display

```vue
<template>
  <div v-loading="myRequirementName.loading">
    <el-table :data="myRequirementName.result">
      <el-table-column prop="name" label="Name" />
      <el-table-column prop="value" label="Value" />
      <el-table-column>
        <template #default="{ row }">
          <el-button type="primary">
            <i class="fas fa-edit"></i>
            {{ $t('edit') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
```

### Form Example

```vue
<template>
  <el-form label-position="top">
    <el-form-item :label="$t('name')">
      <el-input v-model="formData.name" />
    </el-form-item>

    <el-form-item :label="$t('date')">
      <p-calendar v-model="formData.date" />
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary">
        <i class="fas fa-save"></i>
        {{ $t('save') }}
      </el-button>
    </el-form-item>
  </el-form>
</template>
```

### Complex Layout

```vue
<template>
  <el-container>
    <el-aside width="200px">
      <el-menu>
        <el-menu-item>
          <i class="fas fa-home"></i>
          <span>{{ $t('menu.home') }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header>
        <el-page-header :title="$t('page.title')" />
      </el-header>
      
      <el-main>
        <el-tabs>   
          <el-tab-pane :label="$t('tab1')">
            <p-datatable :value="myRequirementName.result">
              <p-column field="name" :header="$t('name')" />
              <p-column field="value" :header="$t('value')" />
            </p-datatable>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </el-container>
</template>
```
