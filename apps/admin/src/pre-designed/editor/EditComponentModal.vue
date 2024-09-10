<template>
  <el-form @submit.stop="submit">
    <el-dialog
        v-model="dialogVisible"
        title="Edit Components"
        width="80vw"
        height="50vh"
        modal-class="edit-component-modal">
      <div class="content">
        <h2>Properties</h2>
        <FormInput v-for="prop in modelProps"
                   :key="prop.propName"
                   :type="prop.type"
                   :title="prop.title"
                   v-model="prop.value"/>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" native-type="button">{{ $t('Cancel') }}</el-button>
          <el-button type="primary" native-type="submit">
            {{ $t('Confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-form>
</template>

<script lang="ts" setup>
import { capitalize, provide, ref, watch } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

const dialogVisible = ref(true)
const model = defineModel<HTMLElement>()
const emit = defineEmits(['save'])

const modelProps = ref(model.value?.getAttributeNames()
    .map(propName => {
      const name = propName.includes(':') ? propName.split(':')[1] : propName;
      const value = model.value.getAttribute(name)
      const type: 'switch' | 'text' = (typeof value === 'boolean' || value === 'true' || value === 'false') ? 'switch' : 'text';
      return {
        propName,
        title: capitalize(name.replace(/-/g, ' ')),
        value: type === 'switch' ? value === 'true' : value,
        type,
      }
    }))

if (!model.value?.hasAttribute('style')) {
  modelProps.value.push({
    propName: 'style',
    title: 'Style',
    value: '',
    type: 'text',
  })
}

if (!model.value?.hasAttribute('class')) {
  modelProps.value.push({
    propName: 'class',
    title: 'Class',
    value: '',
    type: 'text',
  })
}

provide('editableManager', ref(false))

watch(dialogVisible, () => {
  if (!dialogVisible.value) {
    model.value = null;
  }
});

function submit() {
  modelProps.value.forEach(prop => {
    model.value.setAttribute(prop.propName, prop.value.toString())
  });
  if (!model.value.getAttribute('style')) {
    model.value.removeAttribute('style');
  }
  if (!model.value.getAttribute('class')) {
    model.value.removeAttribute('class');
  }
  emit('save', model.value);
  dialogVisible.value = false;
}
</script>
<style scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
}
</style>
<style>
.edit-component-modal .el-dialog {
  overflow: auto;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.edit-component-modal .el-dialog__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto
}
</style>