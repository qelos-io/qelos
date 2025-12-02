<script lang="ts">
import { onBeforeMount, shallowRef, ref } from 'vue';

export default {
  props: {
    height: {
      type: String,
      default: '400px'
    },
    autoresize: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const EChart = shallowRef();
    const wrapperRef = ref(null);
    const chartRef = ref(null);

    onBeforeMount(async () => {
      if (!window.ECharts) {
        await import('echarts');
      }
      EChart.value = (await import('vue-echarts')).default;
    });

    return {
      EChart,
      wrapperRef,
      chartRef
    }
  }
}
</script>

<template>
  <div class="wrapper" ref="wrapperRef">
    <component v-if="EChart" :is="EChart" v-bind="$attrs" :autoresize="autoresize" ref="chartRef"></component>
  </div>
</template>

<style scoped>
.wrapper {
  height: v-bind(height);
}
</style>