<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useBlocksList } from '../store/blocks-list';

const props = defineProps<{ title?: string }>()

const model = defineModel('modelValue', {
  type: String,
  default: ''
})


const { blocks } = storeToRefs(useBlocksList())

</script>

<template>
  <el-form-item>
    <template #label>
      {{ $t(props.title || 'Content Box') }}
    </template>
    <el-select v-model="model" filterable>
      <el-option :label="`(${$t('none')})`" value=""/>
      <el-option v-for="(block) in blocks"
                 :key="block._id"
                 :label="block.name"
                 :value="block._id"/>
    </el-select>
  </el-form-item>
</template>