<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Form, Field, ErrorMessage } from 'vee-validate';

const { t } = useI18n();

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue', 'submit', 'close']);

const form = ref(props.modelValue);

const submit = () => {
  emit('submit', form.value);
};
</script>

<template>
  <Form @submit="submit">
    <div class="form-group">
      <label for="api-key">{{ t('integrations.sumit.apiKey') }}</label>
      <Field
        id="api-key"
        v-model="form.authentication.apiKey"
        name="apiKey"
        type="password"
        class="form-control"
        rules="required"
      />
      <ErrorMessage name="apiKey" class="text-danger" />
    </div>
    <div class="form-group">
      <label for="base-url">{{ t('integrations.sumit.baseUrl') }}</label>
      <Field
        id="base-url"
        v-model="form.metadata.baseUrl"
        name="baseUrl"
        type="text"
        class="form-control"
        rules="required"
      />
      <ErrorMessage name="baseUrl" class="text-danger" />
    </div>
    <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" class="btn btn-primary ms-2">
        {{ t('common.save') }}
      </button>
    </div>
  </Form>
</template>
