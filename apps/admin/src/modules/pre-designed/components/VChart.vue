<script lang="ts">

import { inject, onBeforeMount, shallowRef } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

export default {
  components: { RemoveButton },
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
    const editableManager = inject('editableManager');

    return {
      editableManager,
      EChart,
    }
  }
}
</script>

<template>
  <div class="wrapper">
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el)"/>
    <component v-if="EChart" :is="EChart" v-bind="$attrs"></component>
  </div>
</template>

<style scoped>
.wrapper {
  height: v-bind(height);
}
</style>