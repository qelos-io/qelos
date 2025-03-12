<script setup lang="ts">
import { capitalize } from 'vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { BlueprintPropertyType } from '@qelos/global-types';

const model = defineModel('modelValue')
</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t('Type') }}
      <InfoIcon content="Our platform will validate and enforce this type."/>
    </template>
    <el-select v-model="model">
      <el-option :label="$t(capitalize(BlueprintPropertyType.STRING))" :value="BlueprintPropertyType.STRING"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.NUMBER))" :value="BlueprintPropertyType.NUMBER"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.BOOLEAN))" :value="BlueprintPropertyType.BOOLEAN"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.DATE))" :value="BlueprintPropertyType.DATE"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.TIME))" :value="BlueprintPropertyType.TIME"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.DATETIME))" :value="BlueprintPropertyType.DATETIME"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.OBJECT))" :value="BlueprintPropertyType.OBJECT"/>
      <el-option :label="$t(capitalize(BlueprintPropertyType.FILE))" :value="BlueprintPropertyType.FILE"/>
    </el-select>
  </el-form-item>
</template>