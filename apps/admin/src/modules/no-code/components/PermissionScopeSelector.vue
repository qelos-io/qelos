<script setup lang="ts">
import { capitalize } from 'vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { PermissionScope } from '@qelos/global-types';

const model = defineModel('modelValue')
</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t('Permission Scope') }}
      <InfoIcon content="Permission scope determines the level at which the permission is applied."/>
    </template>
    <el-select v-model="model">
      <el-option :label="$t(capitalize(PermissionScope.WORKSPACE))" :value="PermissionScope.WORKSPACE"/>
      <el-option :label="$t(capitalize(PermissionScope.USER))" :value="PermissionScope.USER"/>
      <el-option :label="$t(capitalize(PermissionScope.TENANT))" :value="PermissionScope.TENANT"/>
    </el-select>
  </el-form-item>
</template>