<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, CopyDocument, Monitor, Refresh } from '@element-plus/icons-vue';
import type { IBlock } from '@/services/types/block';
import RuntimeTemplate from '@/modules/core/components/layout/RuntimeTemplate.vue';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import { useUnsavedChanges } from '../../drafts/compositions/unsaved-changes';
import { useBlockForm } from '../compositions/blocks';
import { useEditorConfig } from '../compositions/editor-config';
import { contentBoxEmbed } from '../services/library';
import WysiwygEditor from './WysiwygEditor.vue';

const props = defineProps<{ block?: Partial<IBlock>; submitting?: boolean }>();
const emit = defineEmits<{ submitted: [payload: Record<string, any>] }>();

const { t } = useI18n();
const router = useRouter();
const { editedBlock, name, content, description } = useBlockForm(props);
const { editorConfig } = useEditorConfig();

useUnsavedChanges('block', props.block?._id, computed(() => props.block?.name), editedBlock);

const isNew = computed(() => !props.block?._id);
const embed = computed(() => (props.block?._id ? contentBoxEmbed(props.block._id) : ''));

// ---- unsaved changes ----
const snapshot = () => JSON.stringify([name.value || '', description.value || '', content.value || '']);
const baseline = ref('');
const justSaved = ref(false);
const dirty = computed(() => !justSaved.value && (isNew.value ? !!(name.value || content.value) : baseline.value !== '' && snapshot() !== baseline.value));
// called by the page right after a successful save, before it navigates
defineExpose({ markSaved: () => (justSaved.value = true) });
watch(() => snapshot(), () => (justSaved.value = false));

onMounted(() => nextTick(() => (baseline.value = snapshot())));
watch(
  () => props.block,
  () => nextTick(() => (baseline.value = snapshot())),
);

onBeforeRouteLeave(async () => {
  if (!dirty.value || props.submitting) return true;
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

// ---- save ----
const nameInput = ref<HTMLInputElement>();
const nameError = ref(false);

function save() {
  if (!name.value?.trim()) {
    nameError.value = true;
    nameInput.value?.focus();
    return;
  }
  nameError.value = false;
  emit('submitted', clearNulls(editedBlock));
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

// ---- preview ----
type Device = 'desktop' | 'tablet' | 'phone';
const device = ref<Device>('desktop');
const WIDTHS: Record<Device, string> = { desktop: '100%', tablet: '768px', phone: '375px' };
const previewKey = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(content, () => {
  clearTimeout(timer);
  timer = setTimeout(() => previewKey.value++, 400);
});
onBeforeUnmount(() => clearTimeout(timer));

// below this width the editor and preview become two tabs
const narrow = ref(false);
const pane = ref<'edit' | 'preview'>('edit');
let media: MediaQueryList | undefined;
const syncMedia = () => (narrow.value = !!media?.matches);
onMounted(() => {
  media = window.matchMedia('(max-width: 1000px)');
  syncMedia();
  media.addEventListener('change', syncMedia);
});
onBeforeUnmount(() => media?.removeEventListener('change', syncMedia));

async function copyEmbed() {
  try {
    await navigator.clipboard.writeText(embed.value);
    ElMessage.success(t('Embed tag copied'));
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}
</script>

<template>
  <form class="workspace" novalidate @submit.prevent="save">
    <header class="bar">
      <el-button class="back" text :aria-label="$t('Back to content boxes')" @click="router.push({ name: 'blocks' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
      </el-button>

      <div class="titles">
        <input
          ref="nameInput"
          v-model="name"
          class="name-input"
          :class="{ invalid: nameError }"
          :placeholder="$t('Untitled content box')"
          :aria-label="$t('Name')"
          :aria-invalid="nameError"
          dir="auto"
          @input="nameError = false"
        />
        <input v-model="description" class="desc-input" :placeholder="$t('Add a short description')" :aria-label="$t('Description')" dir="auto" />
      </div>

      <span v-if="dirty" class="dirty" role="status">{{ $t('Unsaved changes') }}</span>

      <el-popover trigger="click" placement="bottom-end" :width="360">
        <template #reference>
          <el-button>{{ $t('Use this box') }}</el-button>
        </template>
        <div class="embed">
          <p class="embed-title">{{ $t('Embed in any page or component') }}</p>
          <template v-if="embed">
            <pre dir="ltr">{{ embed }}</pre>
            <el-button size="small" @click="copyEmbed"><el-icon><CopyDocument /></el-icon>{{ $t('Copy') }}</el-button>
          </template>
          <p v-else class="embed-note">{{ $t('Save the box first to get its embed tag.') }}</p>
        </div>
      </el-popover>

      <el-button type="primary" native-type="submit" :loading="submitting">{{ $t('Save') }}</el-button>
    </header>

    <el-segmented
      v-if="narrow"
      v-model="pane"
      class="pane-toggle"
      :options="[
        { label: $t('Edit'), value: 'edit' },
        { label: $t('Preview'), value: 'preview' },
      ]"
    />

    <div class="split" :class="{ narrow }">
      <section v-show="!narrow || pane === 'edit'" class="pane editor" :aria-label="$t('Editor')">
        <WysiwygEditor v-model="content" :language="editorConfig.language" />
      </section>

      <section v-show="!narrow || pane === 'preview'" class="pane preview" :aria-label="$t('Preview')">
        <div class="preview-bar">
          <span class="preview-title">{{ $t('Preview') }}</span>
          <el-segmented
            v-model="device"
            size="small"
            :options="[
              { label: $t('Desktop'), value: 'desktop' },
              { label: $t('Tablet'), value: 'tablet' },
              { label: $t('Phone'), value: 'phone' },
            ]"
            :aria-label="$t('Preview width')"
          />
          <el-button text size="small" :aria-label="$t('Refresh preview')" @click="previewKey++"><el-icon><Refresh /></el-icon></el-button>
        </div>
        <div class="preview-stage">
          <div class="preview-frame" :style="{ maxInlineSize: WIDTHS[device] }">
            <ErrorBoundary>
              <RuntimeTemplate v-if="content" :key="previewKey" :template="content" />
            </ErrorBoundary>
            <p v-if="!content" class="preview-empty"><el-icon><Monitor /></el-icon>{{ $t('Start writing to see the preview.') }}</p>
          </div>
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
  min-block-size: 520px;
  padding: 12px 16px;
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.name-input,
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
}

.name-input {
  font-size: 20px;
  font-weight: 600;

  &.invalid {
    border-color: var(--el-color-danger);
  }
}

.desc-input {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dirty {
  flex: none;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  font-size: 12px;
  font-weight: 600;
}

.embed {
  display: flex;
  flex-direction: column;
  gap: 8px;

  pre {
    margin: 0;
    padding: 10px 12px;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    font-size: 12px;
  }
}

.embed-title {
  margin: 0;
  font-weight: 600;
}

.embed-note {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.split {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-block-size: 0;

  &.narrow {
    grid-template-columns: minmax(0, 1fr);
  }
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

.editor {
  overflow: auto;
}

.preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-block-end: 1px solid var(--el-border-color-extra-light);
}

.preview-title {
  margin-inline-end: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.preview-stage {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--el-fill-color-lighter);
}

.preview-frame {
  min-block-size: 100%;
  margin-inline: auto;
  padding: 16px;
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-block-size: 200px;
  margin: 0;
  color: var(--el-text-color-secondary);
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
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
}
</style>
