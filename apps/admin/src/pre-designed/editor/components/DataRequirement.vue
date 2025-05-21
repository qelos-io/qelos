<script setup lang="ts">
import { computed } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const props = defineProps<{
  modelValue: any;
  json: (obj: any) => string;
  getRequirementResult: (row: any) => any;
  updateRowJson: (row: any, key: string, value: string) => void;
}>();

// Since we're not using v-model anymore, we'll work directly with the modelValue prop
const requirement = computed(() => props.modelValue);
</script>

<template>
  <div>
    <el-form-item :label="$t('Data')">
      <Monaco :model-value="json(requirement.fromData) || '{}'"
              style="max-height:350px;"
              @update:model-value="props.updateRowJson(requirement, 'fromData', $event)"/>
    </el-form-item>
    
    <details class="result-preview-details">
      <summary>{{ $t('Result Preview') }}</summary>
      <div class="result-preview">
        <div class="result-preview-content">
          <pre class="result-json">{{ json(getRequirementResult(requirement)) }}</pre>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.result-preview-details {
  margin-top: 1rem;
  margin-inline-start: 20px;
}

.result-preview-details > summary {
  font-weight: bold;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem 0;
}

.result-preview {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  margin-top: 0.5rem;
}

.result-preview-content {
  max-height: 200px;
  overflow: auto;
}

.result-json {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  margin: 0;
}
</style>
