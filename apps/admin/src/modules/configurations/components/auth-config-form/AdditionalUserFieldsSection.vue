<script lang="ts" setup>
import { Delete, Plus } from '@element-plus/icons-vue';
import ConfigCard from '../ConfigCard.vue';

interface UserField {
  key?: string;
  name?: string;
  label?: string;
  inputType: string;
  valueType: string;
  required: boolean;
}

const additionalUserFields = defineModel<UserField[]>('additionalUserFields', { required: true });

const inputTypes = [
  { label: 'Text', value: 'text' },
  { label: 'Select', value: 'select' },
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
];
const valueTypes = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
];

const add = () => additionalUserFields.value.push({ inputType: 'text', key: undefined, label: undefined, name: undefined, required: false, valueType: 'string' });
const remove = (index: number) => additionalUserFields.value.splice(index, 1);
const incomplete = (field: UserField) => !field.key || !field.name || !field.label;
</script>

<template>
  <ConfigCard id="auth-fields" :title="$t('Additional User Fields')" :description="$t('Define custom fields to collect from users during registration')">
    <template #actions>
      <el-button type="primary" plain native-type="button" @click="add"><el-icon><Plus /></el-icon>{{ $t('Add field') }}</el-button>
    </template>

    <p v-if="!additionalUserFields.length" class="empty">{{ $t('No additional fields defined yet. Add fields to collect more information from users.') }}</p>

    <ul v-else class="fields">
      <li v-for="(field, index) in additionalUserFields" :key="index" class="field" :class="{ incomplete: incomplete(field) }">
        <div class="grid">
          <label>
            <span>{{ $t('Key') }} *</span>
            <el-input v-model="field.key" dir="ltr" :aria-invalid="!field.key" />
          </label>
          <label>
            <span>{{ $t('Name') }} *</span>
            <el-input v-model="field.name" :aria-invalid="!field.name" />
          </label>
          <label>
            <span>{{ $t('Label') }} *</span>
            <el-input v-model="field.label" :aria-invalid="!field.label" />
          </label>
          <label>
            <span>{{ $t('Input Type') }}</span>
            <el-select v-model="field.inputType"><el-option v-for="type in inputTypes" :key="type.value" :label="$t(type.label)" :value="type.value" /></el-select>
          </label>
          <label>
            <span>{{ $t('Value Type') }}</span>
            <el-select v-model="field.valueType"><el-option v-for="type in valueTypes" :key="type.value" :label="$t(type.label)" :value="type.value" /></el-select>
          </label>
          <label class="required">
            <span>{{ $t('Required') }}</span>
            <el-switch v-model="field.required" />
          </label>
        </div>
        <el-button class="remove" text circle type="danger" native-type="button" :aria-label="`${$t('Remove')}: ${field.label || field.key || index + 1}`" @click="remove(index)"><el-icon><Delete /></el-icon></el-button>
      </li>
    </ul>
  </ConfigCard>
</template>

<style scoped lang="scss">
.empty {
  margin: 0;
  padding: 14px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.field {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);

  &.incomplete {
    border-color: var(--el-color-warning-light-5);
  }
}

.grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.84rem;
    font-weight: 600;
  }

  .required {
    justify-content: flex-end;
  }
}
</style>
