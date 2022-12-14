<template>
  <div class="config-page">
    <div class="edit-header">
      <h2>{{ $t('Create Configuration') }}</h2>
      <div class="buttons-group">
        <el-button native-type="submit" type="primary" :loading="submitting">
          <el-icon @click="submit">
            <icon-promotion/>
          </el-icon>
        </el-button>
      </div>
    </div>
    <label>
      <el-checkbox :checked="isPublic" @input="isPublic = !isPublic"/>
      Public?
    </label>
    <FormInput title="Key" :model-value="configKey" @input="configKey = $event"/>
    <JsonEditorVue v-model="metadata"/>
  </div>
</template>
<script lang="ts" setup>
import {ref} from 'vue';
import {useSubmitting} from '../core/compositions/submitting'
import configurationsService from '@/services/configurations-service';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import JsonEditorVue from 'json-editor-vue'

const isPublic = ref(false);
const configKey = ref('');
const metadata = ref({});

const {submitting, submit} = useSubmitting(
  () => {
    if (!configKey.value.trim()) {
      return Promise.reject()
    }
    return configurationsService.create({
      public: isPublic.value,
      key: configKey.value,
      metadata: typeof metadata.value === 'string' ? JSON.parse(metadata.value) : metadata.value
    })
  },
  {success: 'Configurations created successfully', error: 'Failed to created configurations'})
</script>
<style>
.config-page {
  padding: 10px;
}
</style>