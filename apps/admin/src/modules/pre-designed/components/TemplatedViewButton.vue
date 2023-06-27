<script setup lang="ts">

</script>

<template>
  <a @click.prevent="$parent.$emit('view')">
    <el-icon>
      <icon-view/>
    </el-icon>
    <slot/>
  </a>
</template>

<style scoped>

</style>