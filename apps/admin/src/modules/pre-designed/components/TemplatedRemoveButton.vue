<script setup lang="ts">

</script>

<template>
  <a @click.prevent="$parent.$emit('remove')">
    <el-icon>
      <icon-delete/>
    </el-icon>
    <slot />
  </a>
</template>

<style scoped>

</style>