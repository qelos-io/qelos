<script setup lang="ts">
defineProps<{ description?: string, imageSize?: number }>()
</script>

<template>
  <el-empty :description="$t(description || 'No Data')" :image-size="imageSize || 200">
    <slot/>
  </el-empty>
</template>

<style scoped>

</style>