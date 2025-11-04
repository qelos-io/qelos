<template>
  <div class="section-container">
    <h2 class="section-title">{{ $t('Additional User Fields') }}</h2>
    <p class="section-description">{{ $t('Define custom fields to collect from users during registration') }}</p>
    
    <div class="user-fields-container">
      <div v-if="additionalUserFields.length === 0" class="empty-state">
        <p>{{ $t('No additional fields defined yet. Add fields to collect more information from users.') }}</p>
      </div>
      
      <FormRowGroup v-for="(row, index) in additionalUserFields" :key="index" class="user-field-row">
        <FormInput v-model="row.key" title="Key" type="text" required/>
        <FormInput v-model="row.name" title="Name" type="text" required/>
        <FormInput v-model="row.label" title="Label" type="text" required/>
        <FormInput v-model="row.inputType" title="Input Type" type="select" required>
          <template #options>
            <el-option label="Text" value="text"/>
            <el-option label="Select" value="select"/>
            <el-option label="Radio" value="radio"/>
            <el-option label="Checkbox" value="checkbox"/>
          </template>
        </FormInput>
        <FormInput v-model="row.valueType" title="Value Type" type="select" required>
          <template #options>
            <el-option label="String" value="string"/>
            <el-option label="Number" value="number"/>
            <el-option label="Boolean" value="boolean"/>
          </template>
        </FormInput>
        <FormInput class="flex-0" v-model="row.required" title="Required" type="switch"/>
        <div class="flex-0 remove-row">
          <RemoveButton @click="additionalUserFields.splice(index, 1)" />
        </div>
      </FormRowGroup>
    </div>
    
    <AddMore
        class="add-field-button"
        @click="additionalUserFields.push({inputType: 'text',key: undefined ,label: undefined ,name: undefined ,required: false ,valueType: 'string'})"/>
  </div>
</template>

<script lang="ts" setup>
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';

interface UserField {
  key?: string;
  name?: string;
  label?: string;
  inputType: string;
  valueType: string;
  required: boolean;
}

const additionalUserFields = defineModel<UserField[]>('additionalUserFields', { required: true });
</script>

<style scoped>
.section-container {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary, #303133);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  padding-bottom: 0.75rem;
}

.section-description {
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.user-fields-container {
  margin-bottom: 1rem;
}

.user-field-row {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 4px;
  background-color: var(--el-bg-color, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.add-field-button {
  margin-top: 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  background-color: var(--el-bg-color, #ffffff);
  border-radius: 4px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  color: var(--el-text-color-secondary, #909399);
}
</style>
