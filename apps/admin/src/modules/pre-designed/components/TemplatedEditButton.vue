<script setup lang="ts">

</script>

<template>
  <a @click.prevent="$parent.$emit('edit')">
    <el-icon>
      <icon-edit/>
    </el-icon>
    <slot />
  </a>
</template>

<style scoped>

</style>