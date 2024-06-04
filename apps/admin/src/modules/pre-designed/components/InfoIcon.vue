<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
  <el-tooltip :content="$t(content)">
    <el-icon>
      <icon-question-filled/>
    </el-icon>
  </el-tooltip>
</template>