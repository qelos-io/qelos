<script setup lang="ts">
defineProps<{
  data: any[],
  columns: Array<{
    prop: string,
    label: string,
    width?: string | number,
    minWidth?: string | number,
    fixed?: boolean
  }>
}>()

</script>

<template>
  <el-table :data="data" style="width: 100%" max-height="250">
    <el-table-column v-for="(col, index) in columns" :key="index" v-bind="col"/>
  </el-table>
</template>

<style scoped>

</style>