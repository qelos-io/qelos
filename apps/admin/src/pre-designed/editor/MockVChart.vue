<script setup lang="ts">
import { ref } from 'vue';

const option = ref({
      "tooltip": {
        "trigger": "axis",
        "axisPointer": {
          "type": "shadow"
        }
      },
      "legend": {},
      "grid": {
        "left": "3%",
        "right": "4%",
        "bottom": "3%",
        "containLabel": true
      },
      "xAxis": [
        {
          "type": "category",
          "data": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        }
      ],
      "yAxis": [
        {
          "type": "value"
        }
      ],
      "series": [
        {
          "name": "Direct",
          "type": "bar",
          "emphasis": {
            "focus": "series"
          },
          "data": [320, 332, 301, 334, 390, 330, 320]
        },
        {
          "name": "Email",
          "type": "bar",
          "stack": "Ad",
          "emphasis": {
            "focus": "series"
          },
          "data": [120, 132, 101, 134, 90, 230, 210]
        }
      ]
    }
)
</script>

<template>
<v-chart height="200px" :option="option"></v-chart>
</template>

<style scoped>

</style>