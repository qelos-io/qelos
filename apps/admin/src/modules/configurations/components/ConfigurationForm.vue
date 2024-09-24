<template>
  <el-form @submit.native.prevent="save" class="config-form">
    <el-button type="primary" @click="editorMode = !editorMode">{{ t('Toggle Editor') }}</el-button>
    <Monaco v-if="editorMode" v-model="metadataJSON"/>
    <template v-else>
      <ConfigurationInput
          v-for="key in keys"
          :key="key"
          v-model="updated[key]"
          :valueType="valuesTypes[key]"/>
    </template>
    <SaveButton :submitting="submitting"/>
  </el-form>
</template>

<script lang="ts">
import { useEditMetadata } from '../compositions/metadata';
import { clearNulls } from '../../core/utils/clear-nulls';
import FormInput from '../../core/components/forms/FormInput.vue';
import ConfigurationInput from './ConfigurationInput.vue'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { computed, ref } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ConfigurationForm',
  components: { Monaco, SaveButton, FormInput, ConfigurationInput },
  props: {
    kind: String,
    metadata: Object,
    submitting: Boolean
  },
  setup({ kind, metadata }, { emit }) {
    const { t } = useI18n();
    const { updated, edited, keys, valuesTypes } = useEditMetadata(kind, metadata)

    const editorMode = ref(false);


    const metadataObj = ref(metadata);
    const metadataJSON = computed({
      get: () => JSON.stringify(metadata, null, 2),
      set: (value: string) => {
        try {
          metadataObj.value = JSON.parse(value);
        } catch (e) {
        }
      }
    })

    return {
      t,
      keys,
      valuesTypes,
      updated,
      edited,
      editorMode,
      metadataJSON,
      save() {
        if (editorMode.value) {
          emit('save', metadataObj.value);
        } else {
          emit('save', clearNulls(edited))
        }
      }
    }
  }
}
</script>
<style scoped>
.config-form {
  padding: 20px;
}
</style>