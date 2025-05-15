<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { TriggerOperation, useIntegrationKindsTriggerOperations } from '@/modules/integrations/compositions/integration-kinds-operations';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue']);

const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();
const triggerOperations = useIntegrationKindsTriggerOperations();

const selectedTriggerOperation = ref<TriggerOperation>();

// Computed property for the selected source
const selectedTriggerSource = computed(() => store.result?.find(s => s._id === props.modelValue.source));

// Use a ref for the trigger details JSON instead of a computed property
const triggerDetailsText = ref(JSON.stringify(props.modelValue.details || {}, null, 2));

// Update trigger details from JSON text
const updateTriggerDetails = (value: string) => {
  try {
    triggerDetailsText.value = value;
    const newModelValue = { ...props.modelValue };
    newModelValue.details = JSON.parse(value);
    emit('update:modelValue', newModelValue);
  } catch (e) {
    // Invalid JSON, ignore
  }
};

// Watch for changes in the model details
watch(() => props.modelValue.details, (newDetails) => {
  if (newDetails) {
    triggerDetailsText.value = JSON.stringify(newDetails, null, 2);
  }
}, { deep: true });

// Handle source change
const handleSourceChange = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.operation = '';
  newModelValue.details = {};
  emit('update:modelValue', newModelValue);
};

// Handle operation change
const handleOperationChange = () => {
  if (!selectedTriggerSource.value) return;
  
  const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
  selectedTriggerOperation.value = operation;
  
  const newModelValue = { ...props.modelValue };
  newModelValue.details = JSON.parse(JSON.stringify(operation?.details || {}));
  emit('update:modelValue', newModelValue);
};

// Set trigger details from option
const setTriggerDetails = (optionValue: any) => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = optionValue;
  emit('update:modelValue', newModelValue);
};

// Watch for changes in trigger source or operation
watch([() => props.modelValue.operation, () => props.modelValue.source], () => {
  if (!selectedTriggerSource.value) return;
  
  const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
  selectedTriggerOperation.value = operation;
});

// Watch for changes in trigger details
watch(() => props.modelValue.details, (newDetails) => {
  triggerDetailsText.value = JSON.stringify(newDetails || {}, null, 2);
}, { deep: true });

// Initialize the UI when the component is mounted
onMounted(() => {
  if (selectedTriggerSource.value && props.modelValue.operation) {
    const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
    selectedTriggerOperation.value = operation;
  }
});
</script>

<style>
/* Global styles for connection selectors */
.qelos-connection-option {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
}

.qelos-connection-icon {
  width: 14px !important;
  height: 14px !important;
  margin-right: 8px !important;
  margin-bottom: 0;
  object-fit: contain !important;
  flex-shrink: 0 !important;
}

.qelos-connection-text {
  font-size: 0.7em !important;
  color: var(--el-text-color-secondary) !important;
  margin-right: 8px !important;
}
</style>

<template>
  <div class="trigger-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Configure the trigger that will start this workflow.') }}
    </el-alert>
    
    <!-- Connection Selection -->
    <div class="section-container">
      <h4>{{ $t('Connection') }}</h4>
      <FormInput type="select" v-model="modelValue.source"
               @change="handleSourceChange"
               label="Connection that will trigger this workflow">
        <template #options>
          <el-option v-for="source in store.result"
                    :key="source._id"
                    :value="source._id"
                    :label="source.name" class="qelos-connection-option">
            <img v-if="kinds[source.kind].logo" class="qelos-connection-icon" :src="kinds[source.kind].logo"
                :alt="kinds[source.kind].name"/>
            <small v-else class="qelos-connection-text">{{ kinds[source.kind].name }}</small>
            <span>{{ source.name }}</span>
          </el-option>
        </template>
      </FormInput>
    </div>
    
    <!-- Operation Selection -->
    <div v-if="selectedTriggerSource" class="section-container">
      <h4>{{ $t('Operation') }}</h4>
      <FormInput v-model="modelValue.operation"
               type="select"
               :options="triggerOperations[selectedTriggerSource?.kind] || []"
               option-value="name"
               option-label="label"
               @change="handleOperationChange"
               label="Operation that will trigger this workflow"/>
    </div>
    
    <!-- Operation Options -->
    <div v-if="selectedTriggerOperation?.options" class="section-container">
      <h4>{{ $t('Presets') }}</h4>
      <div class="operation-options">
        <el-tag v-for="option in selectedTriggerOperation?.options"
         :key="option.value" class="tag"
         @click="setTriggerDetails(option.value)">{{ option.label }}</el-tag>
      </div>
    </div>
    
    <!-- Trigger Details JSON -->
    <div v-if="modelValue.operation" class="section-container">
      <h4>{{ $t('Configuration') }}</h4>
      <Monaco :modelValue="triggerDetailsText" @update:modelValue="updateTriggerDetails" height="300px" language="json" />
    </div>
  </div>
</template>

<style scoped>
.trigger-container {
  padding: 10px 0;
}

.section-container {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color-page);
}

.section-container h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
}

.operation-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  margin: 5px;
  cursor: pointer;
}

.mb-3 {
  margin-bottom: 15px;
}

/* Local styles only */
</style>
