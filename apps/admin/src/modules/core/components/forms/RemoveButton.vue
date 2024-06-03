<template>
  <el-button type="text" native-type="button">
    <el-icon>
      <icon-delete/>
    </el-icon>
    <template v-if="wide">{{ $t(label || 'Remove') }}</template>
  </el-button>
</template>
<script lang="ts" setup>
defineProps({
  wide: Boolean,
  label: String,
})
</script>