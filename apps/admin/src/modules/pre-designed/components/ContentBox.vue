<script setup lang="ts">
import { useBlocks } from '@/modules/blocks/store/blocks';

const props = defineProps<{ identifier: string }>()

const { getBlock, init } = useBlocks()

init(props.identifier);
const block = getBlock(props.identifier);

</script>

<template>
  <div class="content-box" v-html="block"></div>
</template>

<style scoped>

</style>