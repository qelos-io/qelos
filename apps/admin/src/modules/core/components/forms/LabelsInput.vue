<script setup lang="ts">
defineProps<{ title: string }>()
const model = defineModel()

</script>

<template>
  <el-form-item>
    <template #label>{{ $t(title) }}</template>
    <el-select
        v-model="model"
        multiple
        filterable
        allow-create
        default-first-option
        :reserve-keyword="false"
        class="styled-select"
    >
      <slot/>
    </el-select>
  </el-form-item>
</template>

