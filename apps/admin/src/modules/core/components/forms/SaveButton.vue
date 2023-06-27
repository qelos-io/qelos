<template>
  <el-button native-type="submit" :loading="submitting">
    <slot v-if="$slots.default" />
    <template v-else>{{ $t(text) }}</template>
  </el-button>
</template>

<script lang="ts" setup>
defineProps({
  submitting: Boolean,
  text: {type: String, default: 'SAVE'}
})
</script>