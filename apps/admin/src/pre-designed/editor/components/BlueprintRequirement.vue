<script setup lang="ts">
import { computed } from 'vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const props = defineProps<{
  modelValue: any;
  json: (obj: any) => string;
  getRequirementResult: (row: any) => any;
  updateRowJson: (row: any, key: string, value: string) => void;
  clearIfEmpty: (event: any, obj: any, key: string) => void;
  getBlueprintInstructionsCode: (row: any) => string;
}>();

// Since we're not using v-model anymore, we don't need to emit update events
// We'll work directly with the modelValue prop
const requirement = computed(() => props.modelValue);
</script>

<template>
  <div>
    <FormRowGroup>
      <BlueprintSelector v-model="requirement.fromBlueprint.name"/>
      <FormInput v-model="requirement.fromBlueprint.identifier" title="Entity Identifier"
                 placeholder="Try to use: {{identifier}} for dynamic route param"
                 @update:model-value="clearIfEmpty($event, requirement.fromBlueprint, 'identifier')"/>
    </FormRowGroup>
    <div class="checkbox-group">
      <el-switch v-model="requirement.lazy" :active-text="$t('Lazy')" />
      <el-switch 
        :model-value="requirement.fromBlueprint.query?.$populate"
        :active-text="$t('Populate References')"
        @update:model-value="requirement.fromBlueprint.query = { ...requirement.fromBlueprint.query, $populate: $event ? true : undefined }"
      />
      <el-switch 
        :model-value="!!requirement.fromBlueprint.query?.$limit"
        :active-text="$t('Limit # Documents')"
        @update:model-value="requirement.fromBlueprint.query = { ...requirement.fromBlueprint.query, $limit: $event ? 100 : undefined }"
      />
      <el-switch 
        :model-value="!!requirement.fromBlueprint.query?.$page"
        :active-text="$t('Page')"
        @update:model-value="requirement.fromBlueprint.query = { ...requirement.fromBlueprint.query, $page: $event ? '{{query.page}}' : undefined }"
      />
    </div>
    <el-form-item :label="$t('Query Params')">
      <Monaco :model-value="json(requirement.fromBlueprint.query) || '{}'"
              style="max-height:200px;"
              @update:model-value="props.updateRowJson(requirement.fromBlueprint, 'query', $event);"/>
    </el-form-item>
    <details>
      <summary>
        {{ $t('Usage Instructions') }}
      </summary>
      <p>
        {{ $t('You can use the following variables in your template:') }}
        <br>
        <i v-html="getBlueprintInstructionsCode(requirement)"></i>
      </p>
    </details>
    
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

details {
  margin-inline-start: 20px;

  &[open] > summary {
    list-style-type: disclosure-open;
  }

  > summary {
    list-style-type: disclosure-closed;
    user-select: none;
  }
}
</style>
