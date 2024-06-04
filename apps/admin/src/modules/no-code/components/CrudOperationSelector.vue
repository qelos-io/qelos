<script setup lang="ts">
import { capitalize } from 'vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { CRUDOperation } from '@qelos/global-types';

const model = defineModel('modelValue', {
  type: String,
  default: ''
})
</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t('Operation') }}
      <InfoIcon content="Define the operation in which this rule will be applied."/>
    </template>
    <el-select v-model="model">
      <el-option :label="$t(capitalize(CRUDOperation.CREATE))" :value="CRUDOperation.CREATE"/>
      <el-option :label="$t(capitalize(CRUDOperation.READ))" :value="CRUDOperation.READ"/>
      <el-option :label="$t(capitalize(CRUDOperation.UPDATE))" :value="CRUDOperation.UPDATE"/>
      <el-option :label="$t(capitalize(CRUDOperation.DELETE))" :value="CRUDOperation.DELETE"/>
    </el-select>
  </el-form-item>
</template>