<template>
  <div v-if="error" class="error-boundary">
    <h3>Something went wrong</h3>
    <pre>{{ error }}</pre>
    <pre>{{ errorInfo }}</pre>
  </div>
  <slot v-else />
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const error = ref(null)
const errorInfo = ref(null)

defineProps({
  fallback: {
    type: Function,
    default: null
  }
})

const onError = (err, errInfo) => {
  error.value = err
  errorInfo.value = errInfo
  console.error('Error Boundary caught:', err, errInfo)
}

defineExpose({ onError })
</script>

<style scoped>
.error-boundary {
  padding: 1rem;
  background: #ffe6e6;
  border: 2px solid #ff9999;
}
</style>
