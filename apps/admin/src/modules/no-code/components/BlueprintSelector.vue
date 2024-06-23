<script setup lang="ts">
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';

const model = defineModel('modelValue', {
  type: String,
  default: ''
})

defineProps<{ title?: string, info?: string }>()

const { blueprints: allBlueprints } = useBlueprintsStore()

</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t(title || 'Blueprint') }}
      <InfoIcon v-if="info" :content="$t(info)"/>
    </template>
    <el-select v-model="model" filterable>
      <el-option v-for="(blueprint, index) in allBlueprints"
                 :key="index"
                 :label="blueprint.name"
                 :value="blueprint.identifier"/>
    </el-select>
  </el-form-item>
</template>