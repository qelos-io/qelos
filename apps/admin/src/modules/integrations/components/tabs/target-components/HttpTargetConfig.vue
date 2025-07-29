<script setup lang="ts">
import { ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import { HttpTargetOperation } from '@qelos/global-types';

const props = defineProps<{
  modelValue: any;
  operation: string;
}>();

const emit = defineEmits(['update:modelValue']);

// HTTP target UI state
const httpHeaderKeys = ref<Record<string, string>>({});
const httpQueryKeys = ref<Record<string, string>>({});
const httpDetails = ref({
  method: 'GET',
  url: '',
  headers: {},
  query: {},
  body: {}
});
const httpBodyJson = ref('{}');

// Initialize component with existing data if available
const initHttpDetails = () => {
  if (props.modelValue?.details) {
    httpDetails.value = {
      method: props.modelValue.details.method || 'GET',
      url: props.modelValue.details.url || '',
      headers: props.modelValue.details.headers || {},
      query: props.modelValue.details.query || {},
      body: props.modelValue.details.body || {}
    };
    
    // Initialize the JSON string representation of the body
    try {
      httpBodyJson.value = JSON.stringify(props.modelValue.details.body || {}, null, 2);
    } catch (e) {
      httpBodyJson.value = '{}';
    }
    
    // Initialize header keys for UI
    Object.keys(httpDetails.value.headers).forEach(key => {
      httpHeaderKeys.value[key] = key;
    });
    
    // Initialize query keys for UI
    Object.keys(httpDetails.value.query).forEach(key => {
      httpQueryKeys.value[key] = key;
    });
  }
};

// HTTP Methods
const addHttpHeader = () => {
  const newKey = `header${Object.keys(httpDetails.value.headers).length + 1}`;
  httpDetails.value.headers[newKey] = '';
  httpHeaderKeys.value[newKey] = newKey;
  syncHttpDetailsToTargetDetails();
};

const removeHttpHeader = (key: string) => {
  delete httpDetails.value.headers[key];
  delete httpHeaderKeys.value[key];
  syncHttpDetailsToTargetDetails();
};

const updateHttpHeader = (oldKey: string, newKey: string) => {
  if (oldKey !== newKey && newKey) {
    const value = httpDetails.value.headers[oldKey];
    delete httpDetails.value.headers[oldKey];
    httpDetails.value.headers[newKey] = value;
    delete httpHeaderKeys.value[oldKey];
    httpHeaderKeys.value[newKey] = newKey;
    syncHttpDetailsToTargetDetails();
  }
};

const addHttpQuery = () => {
  const newKey = `param${Object.keys(httpDetails.value.query).length + 1}`;
  httpDetails.value.query[newKey] = '';
  httpQueryKeys.value[newKey] = newKey;
  syncHttpDetailsToTargetDetails();
};

const removeHttpQuery = (key: string) => {
  delete httpDetails.value.query[key];
  delete httpQueryKeys.value[key];
  syncHttpDetailsToTargetDetails();
};

const updateHttpQuery = (oldKey: string, newKey: string) => {
  if (oldKey !== newKey && newKey) {
    const value = httpDetails.value.query[oldKey];
    delete httpDetails.value.query[oldKey];
    httpDetails.value.query[newKey] = value;
    delete httpQueryKeys.value[oldKey];
    httpQueryKeys.value[newKey] = newKey;
    syncHttpDetailsToTargetDetails();
  }
};

// Sync UI state to form.target.details
const syncHttpDetailsToTargetDetails = () => {
  try {
    httpDetails.value.body = JSON.parse(httpBodyJson.value);
  } catch (e) {
    httpDetails.value.body = {};
  }
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...httpDetails.value };
  emit('update:modelValue', newModelValue);
};

// Initialize on mount and when modelValue changes
watch(() => props.modelValue, initHttpDetails, { immediate: true });
</script>

<template>
  <div v-if="operation === HttpTargetOperation.makeRequest" class="http-target-config">
    <el-tabs>
      <el-tab-pane :label="$t('Request')">
        <el-form-item :label="$t('Method')">
          <el-select v-model="httpDetails.method" @change="syncHttpDetailsToTargetDetails">
            <el-option value="GET" label="GET" />
            <el-option value="POST" label="POST" />
            <el-option value="PUT" label="PUT" />
            <el-option value="DELETE" label="DELETE" />
            <el-option value="PATCH" label="PATCH" />
          </el-select>
        </el-form-item>
        
        <el-form-item :label="$t('URL Path')">
          <el-input v-model="httpDetails.url" placeholder="/api/endpoint" @input="syncHttpDetailsToTargetDetails" />
        </el-form-item>
      </el-tab-pane>
      
      <el-tab-pane :label="$t('Headers')">
        <div v-for="(value, key) in httpDetails.headers" :key="key" class="key-value-row">
          <el-input v-model="httpHeaderKeys[key]" placeholder="Header Name" @change="updateHttpHeader(key, $event)" />
          <el-input v-model="httpDetails.headers[key]" placeholder="Header Value" @input="syncHttpDetailsToTargetDetails" />
          <el-button type="danger" :icon="Delete" @click="removeHttpHeader(key)" circle />
        </div>
        <el-button type="primary" @click="addHttpHeader" :icon="Plus">{{ $t('Add Header') }}</el-button>
      </el-tab-pane>
      
      <el-tab-pane :label="$t('Query Parameters')">
        <div v-for="(value, key) in httpDetails.query" :key="key" class="key-value-row">
          <el-input v-model="httpQueryKeys[key]" placeholder="Parameter Name" @change="updateHttpQuery(key, $event)" />
          <el-input v-model="httpDetails.query[key]" placeholder="Parameter Value" @input="syncHttpDetailsToTargetDetails" />
          <el-button type="danger" :icon="Delete" @click="removeHttpQuery(key)" circle />
        </div>
        <el-button type="primary" @click="addHttpQuery" :icon="Plus">{{ $t('Add Parameter') }}</el-button>
      </el-tab-pane>
      
      <el-tab-pane :label="$t('Body')">
        <Monaco v-model="httpBodyJson" height="200px" language="json" @update:modelValue="syncHttpDetailsToTargetDetails" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.http-target-config {
  width: 100%;
}

.key-value-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
</style>
