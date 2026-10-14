<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useConfigDraft } from '../compositions/config-shell';

const props = defineProps({
  kind: String,
  metadata: Object as () => Record<string, any>,
  submitting: Boolean,
});
const emit = defineEmits(['save']);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

// one draft is the source of truth for both views
const draft = ref<Record<string, any>>(clone(props.metadata));
useConfigDraft(draft);

const isSimple = (value: unknown) =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value) || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
const keys = computed(() => Object.keys(draft.value));
const simpleKeys = computed(() => keys.value.filter((key) => isSimple(draft.value[key])));
const complexKeys = computed(() => keys.value.filter((key) => !isSimple(draft.value[key])));

const mode = ref<'form' | 'json'>(complexKeys.value.length || !keys.value.length ? 'json' : 'form');

const jsonText = ref(pretty(draft.value));
const jsonError = ref('');
// edits made in the JSON view must not be re-formatted back into the editor while the user is typing
let skipSync = false;

watch(
  draft,
  () => {
    if (skipSync) {
      skipSync = false;
      return;
    }
    jsonText.value = pretty(draft.value);
  },
  { deep: true },
);

function onJson(text: string) {
  jsonText.value = text;
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object');
    jsonError.value = '';
    skipSync = true;
    draft.value = parsed;
  } catch (error: any) {
    jsonError.value = error.message;
  }
}

const typeOf = (value: unknown) => (typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'switch' : 'text');

// string lists are edited as comma separated text
const listModel = (key: string) =>
  computed({
    get: () => (Array.isArray(draft.value[key]) ? draft.value[key].join(', ') : draft.value[key]),
    set: (value: string) => (draft.value[key] = Array.isArray(draft.value[key]) ? value.split(',').map((item) => item.trim()).filter(Boolean) : value),
  });

function format() {
  try {
    const formatted = pretty(JSON.parse(jsonText.value));
    onJson(formatted);
    jsonText.value = formatted;
  } catch {
    // the error is already shown
  }
}

function save() {
  if (jsonError.value) return;
  emit('save', clone(draft.value));
}
</script>

<template>
  <el-form class="generic" @submit.prevent="save">
    <div class="bar">
      <el-segmented v-model="mode" :options="[{ label: $t('Form'), value: 'form' }, { label: $t('JSON'), value: 'json' }]" :aria-label="$t('Editor')" />
      <el-button v-if="mode === 'json'" text type="primary" native-type="button" @click="format">{{ $t('Format JSON') }}</el-button>
    </div>

    <template v-if="mode === 'form'">
      <p v-if="complexKeys.length" class="note">{{ $t('Some values are nested objects. Edit these in the JSON view:') }} <code dir="ltr">{{ complexKeys.join(', ') }}</code></p>
      <p v-if="!simpleKeys.length" class="note">{{ $t('This configuration has no values yet. Add them in the JSON view.') }}</p>
      <div class="fields">
        <FormInput v-for="key in simpleKeys" :key="key" :title="key" :type="typeOf(draft[key])" :model-value="listModel(key).value" @update:model-value="listModel(key).value = $event" />
      </div>
    </template>

    <template v-else>
      <Monaco :model-value="jsonText" language="json" @update:model-value="onJson" />
      <el-alert v-if="jsonError" class="error" type="error" show-icon :closable="false" :title="$t('This JSON is not valid')" :description="jsonError" />
    </template>
  </el-form>
</template>

<style scoped lang="scss">
.generic {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.note {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0 16px;
}
</style>
