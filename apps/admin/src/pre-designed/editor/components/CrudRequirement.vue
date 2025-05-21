<script setup lang="ts">
import { computed } from 'vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

const props = defineProps<{
  modelValue: any;
  json: (obj: any) => string;
  getRequirementResult: (row: any) => any;
  clearIfEmpty: (event: any, obj: any, key: string) => void;
}>();

// Since we're not using v-model anymore, we'll work directly with the modelValue prop
const requirement = computed(() => props.modelValue);
</script>

<template>
  <div>
    <FormRowGroup>
      <el-form-item :label="$t('CRUD Name')" required>
        <el-select v-model="requirement.fromCrud.name">
          <el-option :label="$t('Configurations')" value="configurations"/>
          <el-option :label="$t('Blocks')" value="blocks"/>
          <el-option :label="$t('Blueprints')" value="blueprints"/>
          <el-option :label="$t('Invites')" value="invites"/>
          <el-option :label="$t('Plugins')" value="plugins"/>
          <el-option :label="$t('Storages')" value="storages"/>
          <el-option :label="$t('Users')" value="users"/>
          <el-option :label="$t('Workspaces')" value="workspaces"/>
        </el-select>
      </el-form-item>
      <FormInput v-model="requirement.fromCrud.identifier" title="Identifier"
                 placeholder="Try to use: {{identifier}} for dynamic route param"
                 @update:model-value="clearIfEmpty($event, requirement.fromCrud, 'identifier')"/>
    </FormRowGroup>
    <div class="checkbox-group">
      <el-switch v-model="requirement.lazy" :active-text="$t('Lazy')" />
    </div>
    
    <details class="result-preview-details">
      <summary>{{ $t('Result Preview') }}</summary>
      <div class="result-preview">
        <div class="result-preview-header">
          <el-button size="small" type="primary" @click="getRequirementResult(requirement).retry()">{{ $t('Retry') }}</el-button>
        </div>
        <div class="result-preview-content">
          <pre class="result-json">{{ json(getRequirementResult(requirement)) }}</pre>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

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

.result-preview-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
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
