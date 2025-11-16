<template>
  <div class="config-page">
    <div class="edit-header">
      <h2>{{ t('Create Configuration') }}</h2>
      <div class="buttons-group">
        <el-button type="primary" :loading="submitting" @click="submit">
          <el-icon>
            <icon-promotion/>
          </el-icon>
        </el-button>
      </div>
    </div>
    <label>
      <FormInput title="Public" v-model="isPublic" type="switch"/>
    </label>
    <FormInput title="Key" :model-value="configKey" @input="configKey = $event"/>
    <FormInput title="Kind" :model-value="configKind" @input="configKind = $event"/>
    <Monaco :model-value="metadata" @input="metadata = $event.target.value"/>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { useSubmitting } from '../core/compositions/submitting'
import configurationsService from '@/services/apis/configurations-service';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import Monaco from '../users/components/Monaco.vue';
import { useI18n } from 'vue-i18n';
import type { ICustomConfiguration } from '@qelos/sdk/src/administrator/manage-configurations';
import { useRouter } from 'vue-router';

const router = useRouter();

const { t } = useI18n();
const isPublic = ref(false);
const configKey = ref('');
const configKind = ref('');
const metadata = ref('');

const { submitting, submit } = useSubmitting(
    () => {
      if (!configKey.value.trim()) {
        return Promise.reject()
      }
      return configurationsService.create({
        public: isPublic.value,
        key: configKey.value,
        kind: configKind.value,
        metadata: metadata.value ? JSON.parse(metadata.value) : {}
      })
    },
    { success: 'Configurations created successfully', error: 'Failed to created configurations' },
    (config: ICustomConfiguration) => {
      router.push({name: 'editConfiguration', params: {key: config.key}})
    })
</script>
<style>
.config-page {
  padding: 10px;
}
</style>