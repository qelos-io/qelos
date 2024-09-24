<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

const model = defineModel<string | boolean>('modelValue', {
  type: [String, Boolean],
  default: ''
})

//'top' | 'bottom' | 'user-dropdown' | false;
</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t('Navigation Link Position') }}
      <InfoIcon content="Define the position of the link to this page"/>
    </template>
    <el-select v-model="model">
      <el-option :label="$t('-- No Link --')" :value="false"/>
      <el-option :label="$t('Top area of Navbar')" value="top"/>
      <el-option :label="$t('Bottom area of Navbar')" value="bottom"/>
      <el-option :label="$t('User Dropdown')" value="user-dropdown"/>
    </el-select>
  </el-form-item>
</template>

//