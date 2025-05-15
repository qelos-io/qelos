<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';

const model = defineModel('modelValue', {
  type: String,
  default: ''
})

const { blueprints } = storeToRefs(useBlueprintsStore())
</script>

<template>
  <el-select v-model="model" filterable placeholder="Select Blueprint">
    <el-option v-for="(blueprint, index) in blueprints"
               :key="index + '-' + blueprint.identifier"
               :label="blueprint.name"
               :value="blueprint.identifier"/>
  </el-select>
</template>
