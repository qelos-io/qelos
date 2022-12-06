<template>
  <el-dialog :center="true" v-model="isOpen" :width="parseInt(dimensions.width) + 50">
    <iframe :src="mfe.url" ref="iframe" :style="dimensions"/>
  </el-dialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';

const {closeMfeModal} = usePluginsMicroFrontends()
const isOpen = ref(true)
const props = defineProps({
  props: Object,
  mfe: Object,
})

const dimensions = computed(() => {
  switch (props.mfe.modal.size) {
    case 'sm':
      return {width: '200px', height: '200px'}
    case 'lg':
      return {width: '700px', height: '500px'}
    case 'full':
      return {width: '100%', height: '100%'}
    default:
    case 'md':
      return {width: '400px', height: '400px'}
  }
})

watch(isOpen, () => {
  if (!isOpen.value) {
    closeMfeModal(props.mfe.modal.name);
  }
})
</script>

<style scoped>
iframe {
  border: none;
  width: 100%;
  height: 100%;
}
</style>
