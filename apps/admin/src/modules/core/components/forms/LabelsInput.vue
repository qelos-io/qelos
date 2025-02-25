<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

defineProps<{ title: string, info?: string }>()
const model = defineModel()

</script>

<template>
  <el-form-item>
    <template #label>{{ $t(title) }}
      <InfoIcon v-if="info" :content="$t(info)"/>

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

