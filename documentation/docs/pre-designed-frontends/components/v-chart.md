---
title: V Chart Component
editLink: true
---
# V Chart Component

## Overview

The `<v-chart>` component provides a wrapper around Vue ECharts, allowing you to easily create interactive charts and visualizations in the Qelos template ecosystem. It supports various chart types including line, bar, pie, scatter, and more.

## Usage

```html
<v-chart :option="chartOption" autoresize></v-chart>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `option` | Object | {} | ECharts configuration option |
| `theme` | String/Object | - | Theme to be applied (built-in or custom) |
| `autoresize` | Boolean | false | Whether to automatically resize the chart when container size changes |
| `loading` | Boolean | false | Whether to display a loading state |
| `loadingOptions` | Object | {} | Custom loading options |
| `width` | String/Number | 'auto' | Chart width |
| `height` | String/Number | '400px' | Chart height |
| `group` | String | - | Group name for chart connection |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `legendselectchanged` | (event) | Triggered when legend selection changes |
| `click` | (event) | Triggered when chart is clicked |
| `dblclick` | (event) | Triggered when chart is double-clicked |
| `mouseover` | (event) | Triggered when mouse hovers over a chart element |
| `mouseout` | (event) | Triggered when mouse leaves a chart element |
| `datazoom` | (event) | Triggered when data zoom changes |

## Methods

The `<v-chart>` component exposes the underlying ECharts instance, which can be accessed via a template ref. This allows you to call any ECharts method directly.

```javascript
// Example of accessing the ECharts instance
const chartRef = ref(null);
onMounted(() => {
  // Access the ECharts instance
  const echartsInstance = chartRef.value.chart;
  // Call ECharts methods
  echartsInstance.setOption({...});
});
```

## Examples

### Basic Line Chart

```html
<template>
  <v-chart :option="lineOption" autoresize></v-chart>
</template>

<script setup>
import { ref } from 'vue';

const lineOption = ref({
  title: {
    text: 'Monthly Sales'
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [820, 932, 901, 934, 1290, 1330, 1320],
    type: 'line'
  }]
});
</script>
```

### Bar Chart

```html
<template>
  <v-chart :option="barOption" autoresize></v-chart>
</template>

<script setup>
import { ref } from 'vue';

const barOption = ref({
  title: {
    text: 'Product Sales'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  xAxis: {
    type: 'category',
    data: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E']
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [120, 200, 150, 80, 70],
    type: 'bar'
  }]
});
</script>
```

### Pie Chart

```html
<template>
  <v-chart :option="pieOption" autoresize></v-chart>
</template>

<script setup>
import { ref } from 'vue';

const pieOption = ref({
  title: {
    text: 'User Distribution',
    left: 'center'
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    data: ['Admin', 'Editor', 'Viewer', 'Guest']
  },
  series: [
    {
      name: 'User Types',
      type: 'pie',
      radius: '55%',
      center: ['50%', '60%'],
      data: [
        { value: 335, name: 'Admin' },
        { value: 310, name: 'Editor' },
        { value: 234, name: 'Viewer' },
        { value: 135, name: 'Guest' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
});
</script>
```

### Dynamic Data Loading

```html
<template>
  <v-chart :option="chartOption" :loading="isLoading" autoresize></v-chart>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isLoading = ref(true);
const chartOption = ref({
  title: {
    text: 'API Requests'
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: []
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [],
    type: 'line'
  }]
});

onMounted(async () => {
  try {
    // Simulate API request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update chart data
    chartOption.value.xAxis.data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    chartOption.value.series[0].data = [30, 40, 35, 50, 49, 60, 70];
  } finally {
    isLoading.value = false;
  }
});
</script>
```

---

u00a9 Velocitech LTD. All rights reserved.
