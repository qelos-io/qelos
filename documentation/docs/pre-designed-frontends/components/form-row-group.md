---
title: Form Row Group Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<form-row-group>` component allows you to organize form inputs into horizontal rows, creating a more compact and structured form layout. It's particularly useful for grouping related inputs together or when you need to fit multiple inputs in a single row.

## Usage

```html
<form-row-group>
  <form-input label="First Name" v-model="firstName"></form-input>
  <form-input label="Last Name" v-model="lastName"></form-input>
</form-row-group>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gutter` | Number | 20 | Spacing between form elements in pixels |
| `labelPosition` | String | 'top' | Position of labels ('top', 'left', 'right') |
| `labelWidth` | String | 'auto' | Width of labels when position is 'left' or 'right' |

## Slots

| Slot | Description |
|------|-------------|
| default | Content of the form row group, typically form input components |

## Examples

### Basic Usage with Multiple Inputs

```html
<form-row-group>
  <form-input label="City" v-model="city"></form-input>
  <form-input label="State" v-model="state"></form-input>
  <form-input label="Zip Code" v-model="zipCode"></form-input>
</form-row-group>
```

### Custom Gutter Size

```html
<form-row-group :gutter="30">
  <form-input label="Username" v-model="username"></form-input>
  <form-input label="Email" v-model="email"></form-input>
</form-row-group>
```

### With Left-Positioned Labels

```html
<form-row-group label-position="left" label-width="120px">
  <form-input label="Start Date" v-model="startDate"></form-input>
  <form-input label="End Date" v-model="endDate"></form-input>
</form-row-group>
```

### Nested Form Row Groups

```html
<form-row-group>
  <form-input label="Full Name" v-model="fullName"></form-input>
  <form-row-group>
    <form-input label="Phone" v-model="phone"></form-input>
    <form-input label="Extension" v-model="extension"></form-input>
  </form-row-group>
</form-row-group>
```

---

u00a9 Velocitech LTD. All rights reserved.
