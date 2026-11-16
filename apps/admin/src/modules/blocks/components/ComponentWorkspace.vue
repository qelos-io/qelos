<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, CopyDocument, Upload } from '@element-plus/icons-vue';
import type { INoCodeComponent } from '@qelos/global-types';
import type { IScript } from '@qelos/sdk/src/administrator/scripts';
import Monaco from '@/modules/users/components/Monaco.vue';
import ComponentPreview from './ComponentPreview.vue';
import { useVueFileTemplate } from '../compositions/vue-file-template';
import {
  IDENTIFIER_PATTERN,
  SCRIPT_IDENTIFIER_PATTERN,
  normalizeScriptIdentifier,
  scriptImportSnippet,
  componentUsageTag,
  extractComponentInfo,
  folderOf,
  normalizeIdentifier,
  toKebab,
  type CompileError,
} from '../services/library';

const props = defineProps<{
  /** `script` edits a js/ts module instead of a Vue component: no name, no preview */
  kind?: 'component' | 'script';
  component?: Partial<INoCodeComponent | IScript> | null;
  /** folder a new component is created in; its identifier starts with this path */
  initialFolder?: string;
  saving?: boolean;
  compileError?: CompileError | null;
}>();
const emit = defineEmits<{ submitted: [payload: { componentName?: string; identifier: string; description: string; content: string }] }>();

const { t } = useI18n();
const router = useRouter();
const { defaultVueTemplate } = useVueFileTemplate();
const defaultScriptTemplate = `export function hello(name: string) {\n  return \`Hello \${name}\`;\n}\n`;

const isScript = computed(() => props.kind === 'script');
const normalize = (value: string) => (isScript.value ? normalizeScriptIdentifier(value) : normalizeIdentifier(value));
const isNew = computed(() => !props.component?._id);
const name = ref((props.component as any)?.componentName || '');
const folderPrefix = props.initialFolder ? `${props.initialFolder}/` : '';
const identifier = ref(props.component?.identifier || folderPrefix);
const description = ref(props.component?.description || '');
const content = ref(props.component?.content || (props.kind === 'script' ? defaultScriptTemplate : defaultVueTemplate));
const identifierTouched = ref(!!props.component?.identifier);

// a new component suggests its identifier from the name until the identifier is edited by hand
watch(name, (value) => {
  if (!isScript.value && !identifierTouched.value) identifier.value = folderPrefix + toKebab(value);
});

const errors = ref<{ name?: string; identifier?: string }>({});

function validate() {
  const result: typeof errors.value = {};
  if (!isScript.value && !name.value.trim()) result.name = t('Component name is required');
  const normalized = normalize(identifier.value);
  const pattern = isScript.value ? SCRIPT_IDENTIFIER_PATTERN : IDENTIFIER_PATTERN;
  if (!normalized) result.identifier = t('Identifier is required');
  else if (normalized.split('/').some((part) => part === '.' || part === '..') || !pattern.test(normalized)) result.identifier = t('Use letters, numbers, hyphens and slashes only');
  errors.value = result;
  return !Object.keys(result).length;
}

// ---- unsaved changes ----
const snapshot = () => JSON.stringify([name.value, identifier.value, description.value, content.value]);
const baseline = ref('');
const dirty = computed(() => baseline.value !== '' && snapshot() !== baseline.value);
const markSaved = () => (baseline.value = snapshot());
onMounted(() => nextTick(markSaved));
watch(() => props.component, () => nextTick(markSaved));
defineExpose({ markSaved });

onBeforeRouteLeave(async () => {
  if (!dirty.value || props.saving) return true;
  try {
    await ElMessageBox.confirm(t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'), {
      type: 'warning',
      confirmButtonText: t('Leave'),
      cancelButtonText: t('Stay'),
    });
    return true;
  } catch {
    return false;
  }
});

const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};

function save() {
  if (!validate()) return;
  // a pasted "products/card.vue" or "/products/card/" is saved as the path "products/card"
  identifier.value = normalize(identifier.value);
  emit('submitted', {
    ...(isScript.value ? {} : { componentName: name.value.trim() }),
    identifier: identifier.value,
    description: description.value,
    content: content.value,
  });
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', warnUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', warnUnload);
});

// ---- import a .vue file ----
const fileInput = ref<HTMLInputElement>();

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const extension = isScript.value ? /\.(m?[jt]s)$/i : /\.vue$/i;
  if (!extension.test(file.name)) {
    ElMessage.error(isScript.value ? t('Please choose a .js or .ts file') : t('Please choose a .vue file'));
    return;
  }
  const text = await file.text();
  content.value = text;
  if (isScript.value) {
    if (isNew.value || !identifier.value) {
      identifier.value = folderPrefix + normalizeScriptIdentifier(file.name);
      identifierTouched.value = true;
    }
  } else if (isNew.value || !name.value) {
    const info = extractComponentInfo(text, file.name);
    name.value = info.componentName;
    identifier.value = folderPrefix + info.identifier;
    identifierTouched.value = true;
    description.value = description.value || info.description;
  }
  ElMessage.success(`${file.name} ${t('loaded')}`);
}

// ---- right panel ----
type Panel = 'preview' | 'usage' | 'output';
const panel = ref<Panel>(props.kind === 'script' ? 'usage' : 'preview');
const propsText = ref('');
watch(() => props.compileError, (error) => error && (panel.value = 'output'));

const registeredName = computed(() => props.component?.componentName);
// back to the folder the component lives in
const backFolder = computed(() => folderOf(props.component?.identifier || folderPrefix.slice(0, -1)));
const goBack = () => router.push({ name: 'components', query: backFolder.value ? { folder: backFolder.value } : undefined });
const importLine = computed(() => scriptImportSnippet(normalizeScriptIdentifier(identifier.value)));
const tag = computed(() => componentUsageTag(registeredName.value || name.value || 'my-component'));

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('Copied'));
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}
</script>

<template>
  <form class="workspace" novalidate @submit.prevent="save">
    <header class="bar">
      <el-button text :aria-label="$t('Back to components')" @click="goBack">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
      </el-button>

      <div class="titles">
        <div v-if="!isScript" class="field">
          <input v-model="name" class="name-input" :class="{ invalid: errors.name }" :placeholder="$t('Component name')" :aria-label="$t('Component name')" :aria-invalid="!!errors.name" @input="errors.name = undefined" />
          <span v-if="errors.name" class="error" role="alert">{{ errors.name }}</span>
        </div>
        <div class="field">
          <input
            v-model="identifier"
            class="id-input"
            :class="{ invalid: errors.identifier }"
            dir="ltr"
            :placeholder="$t('identifier')"
            :aria-label="$t('Identifier')"
            :aria-invalid="!!errors.identifier"
            @input="(identifierTouched = true), (errors.identifier = undefined)"
          />
          <span v-if="errors.identifier" class="error" role="alert">{{ errors.identifier }}</span>
        </div>
        <input v-model="description" class="desc-input" :placeholder="$t('Add a short description')" :aria-label="$t('Description')" dir="auto" />
      </div>

      <span v-if="dirty" class="dirty" role="status">{{ $t('Unsaved changes') }}</span>

      <input ref="fileInput" type="file" :accept="isScript ? '.js,.ts,.mjs,.mts' : '.vue'" class="file-input" @change="importFile" />
      <el-button @click="fileInput?.click()"><el-icon><Upload /></el-icon><span class="btn-label">{{ isScript ? $t('Import .js/.ts') : $t('Import .vue') }}</span></el-button>
      <el-button type="primary" native-type="submit" :loading="saving">{{ $t('Save') }}</el-button>
    </header>

    <div class="split">
      <section class="pane code" :aria-label="$t('Code')">
        <Monaco :key="kind" v-model="content" :language="isScript ? 'typescript' : 'html'" height="100%" />
      </section>

      <section class="pane side" :aria-label="$t('Preview')">
        <div class="side-bar">
          <el-segmented
            v-model="panel"
            size="small"
            :options="[
              ...(isScript ? [] : [{ label: $t('Preview'), value: 'preview' }]),
              { label: $t('Usage'), value: 'usage' },
              { label: compileError ? `${$t('Output')} •` : $t('Output'), value: 'output' },
            ]"
            :aria-label="$t('Panel')"
          />
        </div>

        <div v-if="!isScript" v-show="panel === 'preview'" class="side-body">
          <label v-if="registeredName" class="props">
            <span>{{ $t('Props (JSON)') }}</span>
            <textarea v-model="propsText" dir="ltr" rows="2" spellcheck="false" placeholder='{ "title": "Hello" }' />
          </label>
          <ComponentPreview :component-name="registeredName" :props-text="propsText" :stale="dirty" />
        </div>

        <div v-show="panel === 'usage'" class="side-body">
          <template v-if="isScript">
            <h3>{{ $t('Use this script') }}</h3>
            <p class="hint">{{ $t('The @/ prefix means the scripts root, so this import works from a file in any folder. A relative path like ./name.ts also works, and is resolved from the folder of the importing file.') }}</p>
            <div class="snippet">
              <pre dir="ltr">{{ importLine }}</pre>
              <el-button size="small" @click="copy(importLine)"><el-icon><CopyDocument /></el-icon>{{ $t('Copy') }}</el-button>
            </div>
            <p v-if="isNew" class="hint">{{ $t('Save the script first: it can only be imported after it compiled successfully.') }}</p>
          </template>
          <template v-else>
          <h3>{{ $t('Use this component') }}</h3>
          <p class="hint">{{ $t('Once saved and compiled, the component is registered globally under its name. Use it in any page or template:') }}</p>
          <div class="snippet">
            <pre dir="ltr">{{ tag }}</pre>
            <el-button size="small" @click="copy(tag)"><el-icon><CopyDocument /></el-icon>{{ $t('Copy') }}</el-button>
          </div>
          <p v-if="isNew" class="hint">{{ $t('Save the component first: it can only be used after it compiled successfully.') }}</p>
          </template>
        </div>

        <div v-show="panel === 'output'" class="side-body">
          <template v-if="compileError">
            <el-alert type="error" show-icon :closable="false" :title="compileError.message" />
            <pre v-if="compileError.snippet" class="code-snippet" dir="ltr">{{ compileError.snippet }}</pre>
          </template>
          <p v-else class="hint">{{ $t('No compile errors. Errors from the last save show up here.') }}</p>
        </div>
      </section>
    </div>
  </form>
</template>

<style scoped lang="scss">
.workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  block-size: calc(100vh - var(--header-height, 60px) - 24px);
  min-block-size: 560px;
  padding: 12px 16px;
}

.bar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.field {
  display: flex;
  flex-direction: column;
}

.name-input,
.id-input,
.desc-input {
  inline-size: 100%;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;

  &:hover {
    border-color: var(--el-border-color-lighter);
  }

  &:focus {
    border-color: var(--el-color-primary);
    outline: none;
    background: var(--el-bg-color);
  }

  &.invalid {
    border-color: var(--el-color-danger);
  }
}

.name-input {
  font-size: 20px;
  font-weight: 600;
}

.id-input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.desc-input {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.error {
  padding-inline: 6px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.dirty {
  flex: none;
  margin-block-start: 6px;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  font-size: 12px;
  font-weight: 600;
}

.file-input {
  display: none;
}

.btn-label {
  margin-inline-start: 6px;
}

.split {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 12px;
  min-block-size: 0;
}

.pane {
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
}

.code :deep(.monaco) {
  flex: 1;
}

.side-bar {
  padding: 8px 12px;
  border-block-end: 1px solid var(--el-border-color-extra-light);
}

.side-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-block-size: 0;
  padding: 16px;
  overflow: auto;
  background: var(--el-fill-color-lighter);

  h3 {
    margin: 0;
    font-size: 15px;
  }
}

.hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.snippet {
  display: flex;
  align-items: center;
  gap: 10px;

  pre {
    flex: 1;
    margin: 0;
    padding: 10px 12px;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--el-bg-color);
    font-size: 12px;
  }
}

.code-snippet {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  background: var(--el-bg-color);
  font-size: 12px;
  line-height: 1.5;
}

.props {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: none;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  textarea {
    padding: 8px 10px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    resize: vertical;
  }
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 1000px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(320px, 1fr) minmax(280px, 1fr);
  }
}

@media (max-width: 768px) {
  .workspace {
    padding: 8px;
  }

  .bar {
    flex-wrap: wrap;
  }

  .titles {
    flex-basis: calc(100% - 60px);
  }

  .btn-label {
    display: none;
  }
}
</style>
