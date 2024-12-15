<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';

defineProps<{
  value: number;
  title: string;
  label: string;
}>()

</script>

<template>
  <BlockItem>
    <el-statistic :value="value">
      <template #title>
        <div style="display: inline-flex; align-items: center">
          {{$t(title)}}
          <InfoIcon :content="label"/>
        </div>
      </template>
    </el-statistic>
  </BlockItem>
</template>

<style scoped>

</style>