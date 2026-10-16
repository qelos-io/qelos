<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { IBlueprint, IntegrationSourceKind } from '@qelos/global-types';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '../store/blueprints';
import blueprintsService from '@/services/apis/blueprints-service';
import { creationOrder, toReviewRows, withoutDanglingLinks } from '../services/generated-blueprints';

const visible = defineModel<boolean>('visible');
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const router = useRouter();
const sourcesStore = useIntegrationSourcesStore();
const blueprintsStore = useBlueprintsStore();

const step = ref<'prompt' | 'review'>('prompt');
const prompt = ref('');
const sourceId = ref('');
const error = ref('');
const generating = ref(false);
const creating = ref(false);
const generated = ref<Partial<IBlueprint>[]>([]);
const selected = ref<number[]>([]);
const failed = ref<string[]>([]);
const expanded = ref<number | null>(null);
const promptRef = ref<{ focus: () => void } | null>(null);

const AI_KINDS = [IntegrationSourceKind.OpenAI, IntegrationSourceKind.ClaudeAi, IntegrationSourceKind.Gemini];
const aiSources = computed(() => AI_KINDS.flatMap((kind) => sourcesStore.groupedSources?.[kind] || []));
const existing = computed(() => (blueprintsStore.blueprints || []).map((item) => item.identifier));
const rows = computed(() => toReviewRows(generated.value, existing.value));
const examples = [
  'A CRM with customers, deals and notes',
  'Inventory for a small retail store',
  'Projects with tasks, milestones and team members',
];

watch(visible, (open) => {
  if (!open) return;
  if (!sourcesStore.loaded) sourcesStore.retry();
  step.value = 'prompt';
  prompt.value = '';
  error.value = '';
  generated.value = [];
  selected.value = [];
  failed.value = [];
  expanded.value = null;
  nextTick(() => promptRef.value?.focus());
});

watch(aiSources, (sources) => {
  if (sources.length && !sources.some((source) => source._id === sourceId.value)) sourceId.value = sources[0]._id as string;
}, { immediate: true });

function startBlank() {
  emit('close');
  router.push({ name: 'createBlueprint' });
}

function addConnection() {
  emit('close');
  router.push({ name: 'integrations', query: { view: 'connections' } });
}

async function generate() {
  if (!prompt.value.trim()) {
    error.value = t('Describe the app first');
    return;
  }
  error.value = '';
  generating.value = true;
  try {
    const response = await fetch(`/api/ai/sources/${sourceId.value}/blueprints`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value.trim() }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || `${response.status}`);
    generated.value = Array.isArray(body) ? body : [];
    selected.value = toReviewRows(generated.value, existing.value).filter((row) => !row.exists).map((row) => row.index);
    failed.value = [];
    expanded.value = null;
    step.value = 'review';
  } catch (e: any) {
    error.value = e?.message && !/^\d+$/.test(e.message) ? e.message : t('The AI could not draft blueprints. Try again.');
  } finally {
    generating.value = false;
  }
}

function toggle(index: number, checked: boolean) {
  selected.value = checked ? [...selected.value, index] : selected.value.filter((item) => item !== index);
}

async function create() {
  creating.value = true;
  failed.value = [];
  const ordered = withoutDanglingLinks(creationOrder(generated.value, selected.value), existing.value);
  let created = 0;
  for (const blueprint of ordered) {
    try {
      await blueprintsService.create(blueprint);
      created++;
      const index = generated.value.findIndex((item) => item.identifier === blueprint.identifier);
      selected.value = selected.value.filter((item) => item !== index);
    } catch {
      failed.value.push(blueprint.name || (blueprint.identifier as string));
    }
  }
  await blueprintsStore.retry();
  creating.value = false;
  if (created) ElMessage.success(t('{count} blueprints created', { count: created }));
  if (!failed.value.length) {
    emit('close');
    router.push({ name: 'blueprints', query: {} });
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    class="create-drawer"
    direction="rtl"
    :size="$isMobile ? '100%' : 'min(560px, 100%)'"
    :with-header="false"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :aria-label="$t('New blueprint')"
    @close="emit('close')"
  >
    <div class="shell">
      <header class="head">
        <div class="titles">
          <h2>{{ step === 'prompt' ? $t('New blueprint') : $t('Review the draft') }}</h2>
          <p v-if="step === 'prompt'" class="desc" dir="auto">{{ $t('Describe your app and AI drafts the data models. You review everything before anything is created.') }}</p>
          <p v-else class="desc" dir="auto">{{ $t('{count} blueprints drafted. Untick any you do not want; you can edit all of them afterwards.', { count: rows.length }) }}</p>
        </div>
        <el-button text circle class="close" :aria-label="$t('Close')" @click="emit('close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </el-button>
      </header>

      <div class="body">
        <template v-if="step === 'prompt'">
          <div v-if="!aiSources.length && sourcesStore.loaded" class="no-ai">
            <p dir="auto">{{ $t('Connect OpenAI, Claude or Gemini and AI will draft your blueprints from a description, using your own key.') }}</p>
            <el-button type="primary" plain @click="addConnection">{{ $t('Add an AI connection') }}</el-button>
          </div>

          <template v-else>
            <el-form-item :label="$t('What are you building?')" :error="error">
              <el-input
                ref="promptRef"
                v-model="prompt"
                type="textarea"
                :rows="5"
                dir="auto"
                maxlength="1500"
                :placeholder="$t('A CRM with customers, deals and a history of calls and emails')"
                @keydown.meta.enter="generate"
                @keydown.ctrl.enter="generate"
              />
            </el-form-item>
            <div class="examples" role="group" :aria-label="$t('Examples')">
              <button v-for="example in examples" :key="example" type="button" class="example" @click="prompt = $t(example)">{{ $t(example) }}</button>
            </div>
            <el-form-item v-if="aiSources.length > 1" :label="$t('AI connection')" class="source">
              <el-select v-model="sourceId">
                <el-option v-for="source in aiSources" :key="source._id" :label="source.name" :value="source._id as string">
                  <span>{{ source.name }}</span>
                  <small class="kind">{{ source.kind }}</small>
                </el-option>
              </el-select>
            </el-form-item>
          </template>
        </template>

        <template v-else>
          <el-alert v-if="failed.length" type="error" :closable="false" show-icon class="alert">
            {{ $t('Could not create: {names}. They are still ticked, so you can try again.', { names: failed.join(', ') }) }}
          </el-alert>
          <ul class="drafts">
            <li v-for="row in rows" :key="row.index" class="draft" :class="{ off: row.exists }">
              <div class="draft-line">
                <el-checkbox :model-value="selected.includes(row.index)" :disabled="row.exists" :aria-label="row.name" @update:model-value="toggle(row.index, !!$event)" />
                <button type="button" class="draft-main" :aria-expanded="expanded === row.index" @click="expanded = expanded === row.index ? null : row.index">
                  <span class="draft-title">
                    <strong dir="auto">{{ row.name }}</strong>
                    <code dir="ltr">{{ row.identifier }}</code>
                  </span>
                  <span class="draft-meta">
                    <template v-if="row.exists">{{ $t('Already exists') }}</template>
                    <template v-else>{{ row.properties.length === 1 ? $t('1 property') : $t('{count} properties', { count: row.properties.length }) }}<template v-if="row.links.length"> · {{ row.links.length === 1 ? $t('1 link') : $t('{count} links', { count: row.links.length }) }}</template></template>
                  </span>
                </button>
              </div>
              <div v-if="expanded === row.index" class="draft-body">
                <p v-if="row.description" dir="auto" class="draft-desc">{{ row.description }}</p>
                <ul class="props">
                  <li v-for="property in row.properties" :key="property.key">
                    <span dir="auto">{{ property.title }}<b v-if="property.required" class="req" :aria-label="$t('Required')">*</b></span>
                    <el-tag size="small" type="info" effect="plain">{{ $t(property.typeLabel) }}</el-tag>
                    <el-tag v-if="row.links.find((link) => link.key === property.key)" size="small" effect="plain">{{ $t('Links to {name}', { name: row.links.find((link) => link.key === property.key)?.target }) }}</el-tag>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </template>
      </div>

      <footer class="foot">
        <template v-if="step === 'prompt'">
          <el-button text @click="startBlank">{{ $t('Start from scratch') }}</el-button>
          <el-button type="primary" :loading="generating" :disabled="generating || !aiSources.length || !prompt.trim()" @click="generate">
            {{ generating ? $t('Drafting…') : $t('Draft blueprints') }}
          </el-button>
        </template>
        <template v-else>
          <el-button @click="step = 'prompt'">{{ $t('Back') }}</el-button>
          <el-button type="primary" :loading="creating" :disabled="creating || !selected.length" @click="create">
            {{ $t('Create {count} blueprints', { count: selected.length }) }}
          </el-button>
        </template>
      </footer>
    </div>
  </el-drawer>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  block-size: 100%;
  min-block-size: 0;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 16px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.titles {
  flex: 1;
  min-inline-size: 0;
}

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
}

.desc {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.close {
  flex-shrink: 0;
  margin-block: -4px;
  margin-inline-end: -8px;
}

.body {
  flex: 1;
  min-block-size: 0;
  overflow-y: auto;
  padding: 20px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.no-ai {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  color: var(--el-text-color-secondary);
}

.no-ai p {
  margin: 0;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 20px;
}

.example {
  padding: 6px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.example:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.example:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.kind {
  margin-inline-start: 8px;
  color: var(--el-text-color-secondary);
}

.alert {
  margin-block-end: 12px;
}

.drafts,
.props {
  margin: 0;
  padding: 0;
  list-style: none;
}

.drafts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.draft {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.draft.off {
  opacity: 0.6;
}

.draft-line {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-inline-start: 14px;
}

.draft-main {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-inline-size: 0;
  padding: 12px 14px 12px 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.draft-main:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}

.draft-title {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.draft-title code {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.draft-meta {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.draft-body {
  padding: 4px 18px 14px 44px;
}

.draft-desc {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary);
}

.props {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.props li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.req {
  margin-inline-start: 2px;
  color: var(--el-color-danger);
}
</style>

<style>
.create-drawer .el-drawer__body {
  padding: 0;
  overflow: hidden;
}
</style>
