<script setup lang="ts">
import { computed, ref } from 'vue';
import LinkedInForm from './components/forms/LinkedInForm.vue';
import QelosForm from './components/forms/QelosForm.vue';
import OpenAIForm from './components/forms/OpenAIForm.vue';
import SupabaseForm from './components/forms/SupabaseForm.vue';
import N8nForm from './components/forms/N8nForm.vue';
import EmailForm from './components/forms/EmailForm.vue';
import HttpForm from './components/forms/HttpForm.vue';
import ClaudeAiForm from './components/forms/ClaudeAIForm.vue';
import FacebookForm from './components/forms/FacebookForm.vue';
import GoogleForm from './components/forms/GoogleForm.vue';
import GitHubForm from './components/forms/GitHubForm.vue';
import GeminiForm from './components/forms/GeminiForm.vue';
import SumitForm from './components/forms/SumitForm.vue';
import PayPalForm from './components/forms/PayPalForm.vue';
import PaddleForm from './components/forms/PaddleForm.vue';

const props = defineProps<{
  modelValue: any;
  kind: string;
}>();

const emit = defineEmits(['update:modelValue', 'submit', 'close']);

// Map of integration types and components
const formComponentMap = {
  linkedin: LinkedInForm,
  qelos: QelosForm,
  openai: OpenAIForm,
  gemini: GeminiForm,
  claudeai: ClaudeAiForm,
  supabase: SupabaseForm,
  n8n: N8nForm,
  email: EmailForm,
  http: HttpForm,
  facebook: FacebookForm,
  google: GoogleForm,
  github: GitHubForm,
  sumit: SumitForm,
  paypal: PayPalForm,
  paddle: PaddleForm
};

const SelectedFormComponent = computed(() => formComponentMap[props.kind] || null);

const innerFormRef = ref<{ submitForm?: () => void | Promise<void> } | null>(null);

function submitFromModal() {
  innerFormRef.value?.submitForm?.();
}

defineExpose({ submitFromModal });
</script>

<template>
  <div v-if="SelectedFormComponent" class="connection-form-root">
    <component
      ref="innerFormRef"
      :is="SelectedFormComponent"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      @submit="$emit('submit', $event)"
      @close="$emit('close')"
    />
  </div>
  <p v-else class="integration-source-form-fallback">{{ $t('No connection form for type') }}</p>
</template>

<style scoped>
.connection-form-root :deep(.el-form--label-top .el-form-item__label) {
  margin-bottom: 4px;
}

.integration-source-form-fallback {
  margin: 0;
  padding: 12px 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>
