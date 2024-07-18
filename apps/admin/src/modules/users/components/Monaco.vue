<script setup lang="ts">
import { onMounted, ref, defineProps } from 'vue'
import monaco from '@/services/monaco-service'

const props = defineProps({
  modelValue: String,
  language: String,
})

const monacoRef = ref();
let monacoInstance;

onMounted(() => {
  monacoInstance = monaco.editor.create(monacoRef.value, {
    theme: 'vs-dark',
    automaticLayout: true,
    language: props.language || 'json',
    value: props.modelValue,
  })
})

defineExpose({
  getMonaco() {
    return monacoInstance;
  },
  updateValue: (value: string) => {
    monacoInstance?.setValue(value)
  }
})

</script>

<template>
  <div class="monaco" ref="monacoRef"></div>
</template>
<style scoped>
.monaco {
  height: 350px;
  width: 100%;
  margin-bottom: 15px;
}
</style>