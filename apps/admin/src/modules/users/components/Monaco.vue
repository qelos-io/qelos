<script setup lang="ts">
import {onMounted, ref, defineProps} from 'vue'
import monaco from '@/services/monaco-service'

const props = defineProps({
  modelValue: String
})

const monacoRef = ref();
const monacoInstance = ref<ReturnType<typeof monaco.editor.create>>()

onMounted(() => {
  monacoInstance.value = monaco.editor.create(monacoRef.value, {
    theme: 'vs-dark',
    language: 'json',
    value: props.modelValue //metaDataRef.value
  })
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