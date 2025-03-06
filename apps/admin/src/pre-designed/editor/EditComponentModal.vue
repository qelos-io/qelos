<template>
  <el-form @submit.stop="submit">
    <el-drawer
        v-model="dialogVisible"
        :title="$t('Edit Component')"
        size="40%"
        class="edit-component-drawer"
        direction="btt">
      <el-button-group>
        <el-button @click="editorMode = 'props'" :type="editorMode === 'props' ? 'primary' : 'info'">{{ $t('Properties') }}</el-button>
        <el-button @click="editorMode = 'code'" :type="editorMode === 'code' ? 'primary' : 'info'">{{ $t('Code') }}</el-button>
      </el-button-group>
      <div v-if="editorMode === 'code'" style="height:100%;">
        <Monaco v-model="modelHTML"
                language="html"
                style="height:100%;"/>
      </div>
      <FormRowGroup v-if="editorMode === 'props'">
        <FormInput v-for="prop in modelProps"
                   :key="prop.propName"
                   :type="prop.type"
                   :title="prop.title"
                   v-model="prop.value"/>
      </FormRowGroup>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" native-type="button">{{ $t('Cancel') }}</el-button>
          <el-button type="primary" native-type="submit">
            {{ $t('Confirm') }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </el-form>
</template>

<script lang="ts" setup>
import { capitalize, provide, ref, watch } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const editorMode = ref('props');
const dialogVisible = ref(true)
const model = defineModel<HTMLElement>()
const emit = defineEmits(['save'])

const modelHTML = ref('');
const modelProps = ref(model.value?.getAttributeNames()
    .map(propName => {
      const name = propName.includes(':') ? propName.split(':')[1] : propName;
      const value = model.value.getAttribute(propName)
      const type: 'switch' | 'text' = (typeof value === 'boolean' || value === 'true' || value === 'false') ? 'switch' : 'text';
      return {
        propName,
        title: capitalize(name.replace(/-/g, ' ')),
        value: type === 'switch' ? value === 'true' : value,
        type,
      }
    }));

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

function setModelProps() {
  modelProps.value = model.value?.getAttributeNames()
      .map(propName => {
        const name = propName.includes(':') ? propName.split(':')[1] : propName;
        const value = model.value.getAttribute(propName)
        const type: 'switch' | 'text' = (typeof value === 'boolean' || value === 'true' || value === 'false') ? 'switch' : 'text';
        return {
          propName,
          title: capitalize(name.replace(/-/g, ' ')),
          value: type === 'switch' ? value === 'true' : value,
          type,
        }
      })

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
}

function setAttributesToModel() {
  modelProps.value.forEach(prop => {
    try {
      model.value.setAttribute(prop.propName, prop.value.toString())
    } catch {
      //
    }
  });
  if (!model.value.getAttribute('style')) {
    model.value.removeAttribute('style');
  }
  if (!model.value.getAttribute('class')) {
    model.value.removeAttribute('class');
  }
}

function setHtmlToModel() {
  if (!modelHTML.value) {
    return;
  }
  const template = document.createElement('template');
  template.innerHTML = modelHTML.value;
  const newEl = template.content.firstChild as HTMLElement;
  model.value.innerHTML = newEl.innerHTML;
  model.value.getAttributeNames().forEach(attr => {
    model.value.removeAttribute(attr);
  });
  newEl.getAttributeNames().forEach(attr => {
    try {
      model.value.setAttribute(attr, newEl.getAttribute(attr));
    } catch {
      //
    }
  });
}

watch(editorMode, (newMode, oldMode) => {
  if (newMode === 'props') {
    setHtmlToModel();
    setModelProps();
  } else if (oldMode === 'props') {
    setAttributesToModel();
    modelHTML.value = model.value.outerHTML;
  }
})

function submit() {
  if (editorMode.value === 'props') {
    setAttributesToModel();
  } else {
    setHtmlToModel();
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
<style lang="scss">
.edit-component-drawer {
  --el-drawer-padding-primary: 10px;
  .el-drawer__header {
    margin-bottom: 10px;
  }
}
</style>