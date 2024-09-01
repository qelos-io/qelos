<script lang="ts">

import { onBeforeMount, ref } from 'vue';

export default {
  props: {
    height: {
      type: String,
      default: '400px'
    },
  },
  setup() {
    const EChart = ref();
    onBeforeMount(async () => {
      if (!window.ECharts) {
        await import('echarts');
      }
      EChart.value = (await import('vue-echarts')).default;
    });

    return {
      EChart,
    }
  }
}
</script>

<template>
  <div class="wrapper">
    <component v-if="EChart" :is="EChart" v-bind="$attrs"></component>
  </div>
</template>

<style scoped>
.wrapper {
  height: v-bind(height);
}
</style>