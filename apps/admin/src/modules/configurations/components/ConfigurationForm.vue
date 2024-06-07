<template>
  <el-form @submit.native.prevent="save" class="config-form">
    <ConfigurationInput
        v-for="key in keys"
        :key="key"
        v-model="updated[key]"
        :valueType="valuesTypes[key]"/>
    <SaveButton :submitting="submitting"/>
  </el-form>
</template>

<script lang="ts">
import { useEditMetadata } from '../compositions/metadata';
import { clearNulls } from '../../core/utils/clear-nulls';
import FormInput from '../../core/components/forms/FormInput.vue';
import ConfigurationInput from './ConfigurationInput.vue'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';

export default {
  name: 'ConfigurationForm',
  components: { SaveButton, FormInput, ConfigurationInput },
  props: {
    kind: String,
    metadata: Object,
    submitting: Boolean
  },
  setup({ kind, metadata }, { emit }) {
    const { updated, edited, keys, valuesTypes } = useEditMetadata(kind, metadata)

    return {
      keys,
      valuesTypes,
      updated,
      edited,
      save() {
        emit('save', clearNulls(edited))
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