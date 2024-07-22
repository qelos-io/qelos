<script setup lang="ts">
import { useSubmitting } from '@/modules/core/compositions/submitting';

const props = defineProps<{
  onSubmit: (data: any) => Promise<void>;
  data: any | Promise<any>
}>();

const save = useSubmitting(() => props.onSubmit(props.data));
</script>

<template>
<el-form @submit="save">
  <slot/>
</el-form>
</template>

<style scoped>

</style>