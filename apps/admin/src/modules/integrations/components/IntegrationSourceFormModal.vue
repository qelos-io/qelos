<script setup lang="ts">
import FooterActions from '@/modules/core/components/common/FooterActions.vue';
import IntegrationSourceForm from '@/modules/integrations/IntegrationSourceForm.vue';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useIntegrationKinds } from '../compositions/integration-kinds';

const SUBTITLE_ID = 'connection-modal-subtitle';

const visible = defineModel<boolean>('visible');
const props = withDefaults(
  defineProps<{
    editingIntegration?: any;
    kind: string;
    saveLoading?: boolean;
  }>(),
  { saveLoading: false },
);

const emit = defineEmits(['close', 'save']);

const model = ref<any>();
const formShellRef = ref<{ submitFromModal?: () => void } | null>(null);
const bodyRef = ref<HTMLElement | null>(null);

function onGlobalModEnter(e: KeyboardEvent) {
  if (!visible.value) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    formShellRef.value?.submitFromModal?.();
  }
}

watch(visible, (isOpen) => {
  if (isOpen) {
    model.value = props.editingIntegration || {};
    window.addEventListener('keydown', onGlobalModEnter);
  } else {
    window.removeEventListener('keydown', onGlobalModEnter);
  }
});

onUnmounted(() => window.removeEventListener('keydown', onGlobalModEnter));

const kinds = useIntegrationKinds();

const isEdit = computed(() => !!props.editingIntegration?._id);

const providerLabel = computed(
  () => kinds[props.kind as keyof ReturnType<typeof useIntegrationKinds>]?.name ?? props.kind,
);

function onDialogClose() {
  emit('close');
}

function onFooterSave() {
  formShellRef.value?.submitFromModal?.();
}

function onFooterCancel() {
  emit('close');
}

function focusFirstField() {
  nextTick(() => {
    const root = bodyRef.value;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)',
    );
    focusable?.focus();
  });
}

</script>

<template>
  <el-dialog
    v-model="visible"
    class="integration-source-form-modal"
    :width="$isMobile ? '100%' : 'min(560px, 96vw)'"
    :fullscreen="$isMobile"
    top="5vh"
    append-to-body
    align-center
    destroy-on-close
    :close-on-click-modal="false"
    :aria-describedby="SUBTITLE_ID"
    @close="onDialogClose"
    @opened="focusFirstField"
  >
    <template #header>
      <div class="integration-source-dialog-header">
        <div class="integration-source-dialog-title-row">
          <img
            v-if="kinds[props.kind as keyof ReturnType<typeof useIntegrationKinds>]?.logo"
            class="integration-source-dialog-logo"
            :alt="providerLabel"
            :src="kinds[props.kind as keyof ReturnType<typeof useIntegrationKinds>]!.logo"
          />
          <span class="integration-source-dialog-title">
            {{ $t(isEdit ? 'Edit Connection' : 'Create Connection') }}: {{ providerLabel }}
          </span>
        </div>
        <p :id="SUBTITLE_ID" class="integration-source-dialog-subtitle">
          {{ $t('Connection form subtitle') }}
        </p>
        <p class="integration-source-dialog-kbd-hint">{{ $t('Connection modal keyboard hint') }}</p>
      </div>
    </template>

    <div ref="bodyRef" class="integration-source-dialog-body">
      <IntegrationSourceForm
        v-if="visible && model"
        ref="formShellRef"
        v-model="model"
        :kind="kind"
        class="integration-source-form-inner"
        @submit="$emit('save', $event)"
        @close="$emit('close', $event)"
      />
    </div>

    <template #footer>
      <FooterActions
        :show-cancel="true"
        :loading="saveLoading"
        :button-text="$t('Save')"
        class="integration-source-form-footer-actions"
        button-aria-label="Save connection"
        aria-label="Connection form actions"
        @save="onFooterSave"
        @cancel="onFooterCancel"
      />
    </template>
  </el-dialog>
</template>

<style scoped>
.integration-source-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-inline-end: 28px;
}

.integration-source-dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.integration-source-dialog-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
}

.integration-source-dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
}

.integration-source-dialog-subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.integration-source-dialog-kbd-hint {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--el-text-color-placeholder);
}

.integration-source-dialog-body {
  min-height: 0;
}

.integration-source-form-footer-actions {
  margin-top: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
</style>

<style>
.integration-source-form-modal {
  --connection-form-max-body: min(72vh, 720px);
}

.integration-source-form-modal .el-dialog {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  margin-top: 5vh !important;
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
  box-shadow: var(--el-box-shadow);
}

.integration-source-form-modal .el-dialog__header {
  padding: 20px 20px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-inline-end: 0;
  background: var(--el-fill-color-blank);
}

.integration-source-form-modal .el-dialog__headerbtn {
  top: 12px;
}

.integration-source-form-modal .el-dialog__body {
  padding: 16px 20px;
  max-height: var(--connection-form-max-body);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scroll-behavior: smooth;
}

.integration-source-form-modal .el-dialog__footer {
  padding: 0;
}

.integration-source-form-modal .integration-source-form-inner {
  display: block;
}

@media (max-width: 768px) {
  .integration-source-form-modal .el-dialog {
    border-radius: 0;
    max-height: 100%;
    margin-top: 0 !important;
  }

  .integration-source-form-modal .el-dialog__body {
    max-height: calc(100vh - 200px);
  }
}
</style>
