<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
  <el-tooltip :content="$t(content)">
    <el-icon class="info-icon">
      <icon-question-filled/>
    </el-icon>
  </el-tooltip>
</template>

<style scoped>
.info-icon {
  color: var(--el-text-color-placeholder);
  cursor: help;
}

.info-icon:hover {
  color: var(--el-color-primary);
}
</style>
