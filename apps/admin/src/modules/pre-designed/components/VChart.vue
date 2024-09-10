<script lang="ts">

import { onBeforeMount, shallowRef } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';

export default {
  components: { EditComponentBar, RemoveButton },
  props: {
    height: {
      type: String,
      default: '400px'
    },
  },
  setup() {
    const EChart = shallowRef();
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
    <EditComponentBar/>
    <component v-if="EChart" :is="EChart" v-bind="$attrs"></component>
  </div>
</template>

<style scoped>
.wrapper {
  height: v-bind(height);
}
</style>