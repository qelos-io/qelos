<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import monaco from '@/services/monaco-service'

const props = defineProps({
  modelValue: String,
  language: String,
  height: {
    type: String,
    default: '350px'
  }
})

const emit = defineEmits(['update:modelValue'])

const monacoRef = ref();
let monacoInstance;

onMounted(() => {
  monacoInstance = monaco.editor.create(monacoRef.value, {
    theme: 'vs-dark',
    automaticLayout: true,
    language: props.language || 'json',
    value: typeof props.modelValue === 'string' ? props.modelValue : JSON.stringify(props.modelValue, null, 2),
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

watch(() => props.modelValue, (newValue) => {
  try {
    if (typeof newValue === 'string' && newValue !== monacoInstance?.getValue()) {
      monacoInstance?.setValue(newValue)
    }
  } catch (error) {
    console.error('Error updating Monaco editor:', error)
  }
})


function emitUpdate() {
  emit('update:modelValue', monacoInstance.getValue())
}

</script>

<template>
  <div class="monaco" ref="monacoRef" @keyup="emitUpdate"></div>
</template>
<style scoped>
.monaco {
  height: v-bind(height);
  width: 100%;
  margin-bottom: 15px;
}
</style>