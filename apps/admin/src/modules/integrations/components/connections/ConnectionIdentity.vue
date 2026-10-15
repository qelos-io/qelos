<script setup lang="ts">
import { computed } from 'vue';
import { useIntegrationSourcesStore } from '../../store/integration-sources';
import { collectLabelSuggestions } from '../../services/connection-fields';

defineProps<{ error?: string }>();
const name = defineModel<string>('name');
const labels = defineModel<string[]>('labels');
const emit = defineEmits<{ edited: [] }>();

const store = useIntegrationSourcesStore();
const suggestions = computed(() => collectLabelSuggestions(store.result));
</script>

<template>
  <el-form-item :label="$t('Name')" required :error="error ? $t(error) : ''" data-field="name">
    <el-input v-model="name" dir="auto" size="large" @input="emit('edited')" />
  </el-form-item>
  <el-form-item :label="$t('Labels')">
    <el-select
      v-model="labels"
      multiple
      filterable
      allow-create
      default-first-option
      size="large"
      :placeholder="$t('Add a label')"
      :reserve-keyword="false"
    >
      <el-option v-for="label in suggestions" :key="label" :label="label" :value="label" />
    </el-select>
  </el-form-item>
</template>
