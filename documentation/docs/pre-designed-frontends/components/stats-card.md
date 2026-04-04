---
title: Stats Card
editLink: true
---

# Stats Card

A card component designed for displaying statistics and key metrics with visual indicators.

## Usage

```html
<stats-card 
  title="Total Users"
  :value="userCount"
  :change="userGrowth"
  icon="user"
></stats-card>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | Required | The statistic title or label |
| value | number \| string | Required | The main statistic value |
| change | number | undefined | Change value (positive/negative for trend) |
| changeText | string | undefined | Custom text for change indicator |
| icon | string | undefined | Icon name to display |
| color | 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' | 'primary' | Theme color |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Card size |
| loading | boolean | false | Loading state |
| prefix | string | undefined | Prefix for value (e.g., '$') |
| suffix | string | undefined | Suffix for value (e.g., '%') |
| formatter | Function | undefined | Custom value formatter |

## Features

- **Visual Trends**: Shows positive/negative changes with indicators
- **Flexible Formatting**: Support for prefixes, suffixes, and custom formatters
- **Icon Integration**: Optional icons for visual context
- **Loading States**: Skeleton loading while data fetches
- **Responsive Design**: Adapts to different screen sizes

## Examples

### Basic Stats Card

```html
<script setup>
const totalSales = ref(45678)
const salesGrowth = ref(12.5)
</script>

<template>
  <stats-card 
    title="Total Sales"
    :value="totalSales"
    :change="salesGrowth"
    prefix="$"
    icon="money"
    color="success"
  />
</template>
```

### With Custom Formatter

```html
<script setup>
const largeNumber = ref(1234567)

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num)
}
</script>

<template>
  <stats-card 
    title="Total Views"
    :value="largeNumber"
    :formatter="formatNumber"
    icon="eye"
    color="info"
  />
</template>
```

### Multiple Stats in Grid

```html
<div class="stats-grid">
  <stats-card 
    title="Active Users"
    :value="2341"
    :change="8.2"
    icon="user"
    color="primary"
  />
  <stats-card 
    title="Conversion Rate"
    :value="3.24"
    suffix="%"
    :change="-0.5"
    icon="chart"
    color="warning"
  />
  <stats-card 
    title="Avg. Session"
    :value="542"
    suffix="s"
    :change="15"
    icon="clock"
    color="success"
  />
  <stats-card 
    title="Bounce Rate"
    :value="42.3"
    suffix="%"
    :change="-3.1"
    icon="warning"
    color="danger"
  />
</div>
```

### Loading State

```html
<stats-card 
  title="Loading Stat"
  value="--"
  loading
  icon="loading"
/>
```

### Custom Change Text

```html
<stats-card 
  title="Monthly Revenue"
  :value="125000"
  prefix="$"
  change-text="vs last month"
  :change="15.3"
  icon="trending-up"
  color="success"
/>
```

---

© Velocitech LTD. All rights reserved.
