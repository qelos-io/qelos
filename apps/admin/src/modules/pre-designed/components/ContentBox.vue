<script setup lang="ts">
import { useBlocks } from '@/modules/blocks/store/blocks';
import VRuntimeTemplate from 'vue3-runtime-template';

const props = defineProps<{ identifier: string }>()

const { getBlock, init } = useBlocks()

init(props.identifier);
const block = getBlock(props.identifier);

</script>

<template>
  <div class="content-box">
    <VRuntimeTemplate :template="block"/>
  </div>
</template>

<style scoped>

</style>