<script setup lang="ts">
import { computed } from 'vue';
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
  github: GitHubForm
};

const SelectedFormComponent = computed(() => formComponentMap[props.kind] || null);
</script>

<template>
  <component
    v-if="SelectedFormComponent"
    :is="SelectedFormComponent"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @submit="$emit('submit', $event)"
    @close="$emit('close')"
  />
  <p v-else>No form available for this integration type.</p>
</template>
