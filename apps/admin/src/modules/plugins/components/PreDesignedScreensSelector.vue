<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

const model = defineModel('modelValue', {
  type: [String, Boolean],
  default: ''
})

//'top' | 'bottom' | 'user-dropdown' | false;
</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t('Base Template') }}
      <InfoIcon content="Define the base template to start your screen view"/>
    </template>
    <el-select v-model="model">
      <el-option :label="$t('Basic Form')" value="basic-form"/>
      <el-option :label="$t('Rows List')" value="rows-list"/>
      <el-option :label="$t('Plain (blank page)')" value="plain"/>
    </el-select>
  </el-form-item>
</template>

//