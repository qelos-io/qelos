<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

defineProps<{ title: string, info?: string }>()
const model = defineModel()

</script>

<template>
  <el-form-item>
    <template #label>
      <slot v-if="$slots.label" name=label></slot>
      <template v-else>
        {{ title }}
      <InfoIcon v-if="info" :content="info"/>
      </template>
    </template>
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
