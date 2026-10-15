<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import IntegrationSourceForm from '@/modules/integrations/IntegrationSourceForm.vue';
import ConnectionStatusCheck from '@/modules/integrations/components/ConnectionStatusCheck.vue';
import { useIntegrationKinds } from '../../compositions/integration-kinds';
import { getConnectionSchema } from '../../services/connection-fields';

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

type FormShell = {
  submitFromModal?: () => void;
  getAuthenticationOverride?: () => Record<string, unknown> | undefined;
  getStatusFormModel?: () => { metadata?: Record<string, unknown> };
};

const model = ref<any>();
const formShellRef = ref<FormShell | null>(null);
const bodyRef = ref<HTMLElement | null>(null);

const kinds = useIntegrationKinds();
const provider = computed(() => kinds[props.kind as keyof typeof kinds]);
const providerLabel = computed(() => provider.value?.name ?? props.kind);
const description = computed(() => getConnectionSchema(props.kind)?.description);
const isEdit = computed(() => !!props.editingIntegration?._id);
const direction = computed(() => (document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl'));
const saveHint = navigator.platform?.includes('Mac') ? '⌘ ↵' : 'Ctrl ↵';

function onGlobalModEnter(e: KeyboardEvent) {
  if (!visible.value) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    save();
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

const save = () => formShellRef.value?.submitFromModal?.();
const getStatusFormModel = () => formShellRef.value?.getStatusFormModel?.() ?? { metadata: model.value?.metadata ?? {} };
const getAuthenticationOverride = () => formShellRef.value?.getAuthenticationOverride?.();

function focusFirstField() {
  nextTick(() => {
    bodyRef.value
      ?.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled)')
      ?.focus({ preventScroll: true });
  });
}
</script>

<template>
  <el-drawer
    v-model="visible"
    class="connection-drawer"
    :direction="direction"
    :size="$isMobile ? '100%' : 'min(520px, 100%)'"
    :with-header="false"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :aria-label="providerLabel"
    @close="emit('close')"
    @opened="focusFirstField"
  >
    <div class="shell">
      <header class="head">
        <img v-if="provider?.logo" class="logo" alt="" :src="provider.logo" />
        <div class="titles">
          <h2 class="title" dir="auto">
            {{ $t(isEdit ? 'Edit {provider} connection' : 'New {provider} connection', { provider: providerLabel }) }}
          </h2>
          <p v-if="description" class="desc">{{ $t(description) }}</p>
        </div>
        <el-button class="close" text circle :aria-label="$t('Close')" @click="emit('close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </el-button>
      </header>

      <div ref="bodyRef" class="body">
        <IntegrationSourceForm
          v-if="visible && model"
          ref="formShellRef"
          v-model="model"
          :kind="kind"
          @submit="emit('save', $event)"
          @close="emit('close')"
        />
        <ConnectionStatusCheck
          v-if="visible && model"
          :kind="kind"
          :source-id="editingIntegration?._id"
          :form-model="model"
          :get-form-model="getStatusFormModel"
          :get-authentication-override="getAuthenticationOverride"
        />
      </div>

      <footer class="foot">
        <el-button @click="emit('close')">{{ $t('Cancel') }}</el-button>
        <el-tooltip :content="saveHint" placement="top">
          <el-button type="primary" :loading="saveLoading" :disabled="saveLoading" @click="save">
            {{ $t('Save') }}
          </el-button>
        </el-tooltip>
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

.logo {
  inline-size: 28px;
  block-size: 28px;
  object-fit: contain;
  flex-shrink: 0;
  margin-block-start: 2px;
}

.titles {
  flex: 1;
  min-inline-size: 0;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
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
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
</style>

<style>
.connection-drawer .el-drawer__body {
  padding: 0;
  overflow: hidden;
}

.connection-drawer .el-form-item {
  margin-block-end: 22px;
}

.connection-drawer .el-form-item--label-top .el-form-item__label {
  margin-block-end: 6px;
  line-height: 1.3;
}

.connection-drawer .el-form-item__error {
  position: static;
  padding-block-start: 4px;
}

/* FormInput wraps its label in a block, which pushed the required asterisk onto its own line. */
.connection-drawer .el-form-item__label .label-container {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
