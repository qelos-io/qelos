<script setup lang="ts">
import { computed } from 'vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';

const props = defineProps<{
  modelValue: any;
  json: (obj: any) => string;
  getRequirementResult: (row: any) => any;
  updateRowJson: (row: any, key: string, value: string) => void;
  clearIfEmpty: (event: any, obj: any, key: string) => void;
}>();


function getHttpInstructionsCode(row) {
  if (row.fromHTTP) {
    const texts = [
      `<strong>{{${row.key}.result}}</strong> will be the response of the HTTP request`,
      `<strong>{{${row.key}.loading}}</strong> and <strong>{{${row.key}.loaded}}</strong> can help you distinguish rather the API call is loading or loaded.`
    ]
    return texts.join('<br>')
  }
}

// Since we're not using v-model anymore, we'll work directly with the modelValue prop
const requirement = computed(() => props.modelValue);

const query = computed(() => requirement.value.fromHTTP.query);

const { result, loading, loaded, error, retry } = useDispatcher(async () => {
  const url = requirement.value.fromHTTP.uri?.startsWith('http') ? requirement.value.fromHTTP.uri : new URL(requirement.value.fromHTTP.uri, location.origin);
  url.search = new URLSearchParams(query.value).toString();
    
  const response = await fetch(url, {
    method: requirement.value.fromHTTP.method,  
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return response.json();
}, null, true);
</script>

<template>
  <div>
    <FormRowGroup>
      <el-form-item :label="$t('Method')">
        <el-select v-model="requirement.fromHTTP.method" size="small" class="w-full">
          <el-option value="GET" label="GET" />
          <el-option value="POST" label="POST" />
          <el-option value="PUT" label="PUT" />
          <el-option value="PATCH" label="PATCH" />
          <el-option value="DELETE" label="DELETE" />
          <el-option value="HEAD" label="HEAD" />
          <el-option value="OPTIONS" label="OPTIONS" />
        </el-select>
      </el-form-item>
      <FormInput v-model="requirement.fromHTTP.uri" title="URL" placeholder="https://example.com/api" required/>
    </FormRowGroup>
    <div class="checkbox-group">
      <el-switch v-model="requirement.lazy" :active-text="$t('Lazy')" />
    </div>
    <el-form-item :label="$t('Query Params')">
      <Monaco :model-value="json(requirement.fromHTTP.query) || '{}'"
              style="max-height:200px;"
              @update:model-value="props.updateRowJson(requirement.fromHTTP, 'query', $event);"/>
    </el-form-item>
    <details>
      <summary>
        {{ $t('Usage Instructions') }}
      </summary>
      <p>
        {{ $t('You can use the following variables in your template:') }}
        <br>
        <i v-html="getHttpInstructionsCode(requirement)"></i>
      </p>
    </details>
    
    <details class="result-preview-details">
      <summary>{{ $t('Result Preview') }}</summary>
      <div class="result-preview">
        <div class="result-preview-header">
          <el-button size="small" type="primary" @click="retry()">{{ $t('Retry') }}</el-button>
        </div>
        <div class="result-preview-content">
          <pre class="result-json">{{ json({loading, loaded, error, retry, result}) }}</pre>
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
