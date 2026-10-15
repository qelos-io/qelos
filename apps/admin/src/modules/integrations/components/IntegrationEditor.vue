<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, CopyDocument, Delete, DocumentCopy, MoreFilled } from '@element-plus/icons-vue';
import type { IIntegration } from '@qelos/global-types';
import integrationsService from '@/services/apis/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { IntegrationType } from '@/modules/integrations/utils/integration-type-detector';
import AIAgentForm from '@/modules/integrations/components/forms/AIAgentForm.vue';
import WorkflowIntegrationView from '@/modules/integrations/components/WorkflowIntegrationView.vue';
import PasteIntegrationDialog from '@/modules/integrations/components/PasteIntegrationDialog.vue';
import { useIntegrationFormState } from '@/modules/integrations/compositions/use-integration-form-state';
import { automationName, cloneForCreate } from '../services/integration-presentation';
import { WORKFLOW_STEPS, stepsNeedingAttention } from '../services/workflow-steps';

const props = defineProps<{
  editingIntegration?: Partial<IIntegration>;
  /** open as an AI agent (new integrations only; an existing one is detected from its trigger) */
  agent?: boolean;
  preSelectedSourceId?: string;
  clone?: boolean;
}>();

const { t } = useI18n();
const router = useRouter();
const store = useIntegrationSourcesStore();
const integrationsStore = useIntegrationsStore();

const { form, selectedViewMode, setSelectedViewMode } = useIntegrationFormState({
  props,
  visible: ref(true),
  sourcesStore: store,
  isAIAgentMode: props.agent,
  preSelectedSourceId: props.preSelectedSourceId,
});

const isNew = computed(() => !props.editingIntegration?._id);
const isAgent = computed(() => selectedViewMode.value === IntegrationType.AIAgent);
const name = computed(() => (form.trigger?.details as any)?.name as string | undefined);
const sourcesById = computed(() => Object.fromEntries((store.result || []).map((source: any) => [source._id, source])));
// an existing integration without a name reads as "from → to", like in the list
const title = computed(() => name.value || (isNew.value ? t(isAgent.value ? 'New AI agent' : 'New workflow') : automationName(form as any, sourcesById.value)));

// ---- unsaved changes ----
const snapshot = () => JSON.stringify(form); // read through the proxy so the dirty check tracks every nested edit
const baseline = ref('');
const ready = ref(false);
const dirty = computed(() => ready.value && snapshot() !== baseline.value);
const skipGuard = ref(false);

function applyClone() {
  if (!props.clone) return;
  const stored = sessionStorage.getItem('clonedIntegration');
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    form.trigger = { ...parsed.trigger };
    form.target = { ...parsed.target };
    form.dataManipulation = parsed.dataManipulation || [];
    form.targetManipulation = parsed.targetManipulation || [];
    form.active = parsed.active || false;
    if (parsed.trigger?.operation === 'chatCompletion') setSelectedViewMode(IntegrationType.AIAgent, { manual: true });
    sessionStorage.removeItem('clonedIntegration');
  } catch (error) {
    console.error('Failed to read the duplicated integration', error);
  }
}

// the forms normalise some values right after they mount; those are not the user's edits
let settle: ReturnType<typeof setTimeout>;
onMounted(() => {
  nextTick(applyClone);
  settle = setTimeout(() => {
    baseline.value = snapshot();
    ready.value = true;
  }, 700);
});
onBeforeUnmount(() => clearTimeout(settle));

function discard() {
  const original = JSON.parse(baseline.value);
  Object.assign(form, original);
}

// ---- save ----
const saving = ref(false);
const problems = computed(() => (isAgent.value ? [] : stepsNeedingAttention(form as any)));

async function save() {
  if (saving.value) return;
  if (isAgent.value && !name.value) {
    ElMessage.error(t('Name your agent before saving.'));
    return;
  }
  if (problems.value.length) {
    const titles = problems.value.map((id) => t(WORKFLOW_STEPS.find((step) => step.id === id)!.title)).join(', ');
    ElMessage.error(`${t('Finish the required steps before saving:')} ${titles}`);
    return;
  }
  saving.value = true;
  try {
    if (isNew.value) {
      const created = await integrationsService.create(form as any);
      await integrationsStore.retry();
      ElMessage.success(t('Integration created'));
      skipGuard.value = true;
      router.replace({ name: 'integration-edit', params: { integrationId: (created as any)._id } });
    } else {
      await integrationsService.update(props.editingIntegration!._id!, form as any);
      await integrationsStore.retry();
      baseline.value = snapshot();
      ElMessage.success(t('Integration saved'));
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || t('Failed to save integration'));
  } finally {
    saving.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
}

const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', warnUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', warnUnload);
});

onBeforeRouteLeave(async () => {
  if (!dirty.value || skipGuard.value || saving.value) return true;
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

// ---- the more menu ----
const pasteOpen = ref(false);

function applyPasted(parsed: Record<string, any>) {
  const strip = (rows: any[] | undefined) => (rows || []).map(({ _id, ...row }) => row);
  form.trigger = parsed.trigger;
  form.target = parsed.target;
  form.dataManipulation = strip(parsed.dataManipulation) as any;
  form.targetManipulation = strip(parsed.targetManipulation) as any;
  ElMessage.success(t('Integration object applied successfully'));
}

async function copyJson() {
  const { trigger, target, dataManipulation, targetManipulation } = JSON.parse(snapshot());
  try {
    await navigator.clipboard.writeText(JSON.stringify({ trigger, target, dataManipulation, targetManipulation }, null, 2));
    ElMessage.success(t('Copied to clipboard'));
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}

function duplicate() {
  sessionStorage.setItem('clonedIntegration', JSON.stringify(cloneForCreate(JSON.parse(snapshot()))));
  skipGuard.value = true;
  router.push({ name: 'integration-new', query: { type: isAgent.value ? 'agent' : 'workflow', clone: 'true' } });
}

async function remove() {
  try {
    await ElMessageBox.confirm(t('Are you sure you want to delete this integration?'), t('Confirm Delete'), { type: 'warning' });
  } catch {
    return;
  }
  try {
    await integrationsService.remove(props.editingIntegration!._id!);
    await integrationsStore.retry();
    skipGuard.value = true;
    router.push({ name: 'integrations' });
  } catch {
    ElMessage.error(t('Failed to remove integration'));
  }
}

function onCommand(command: string) {
  if (command === 'paste') pasteOpen.value = true;
  else if (command === 'copy') copyJson();
  else if (command === 'duplicate') duplicate();
  else if (command === 'remove') remove();
}
</script>

<template>
  <div class="editor">
    <header class="head">
      <el-button text class="back" :aria-label="$t('Back to integrations')" @click="router.push({ name: 'integrations' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon><span>{{ $t('Integrations') }}</span>
      </el-button>
      <div class="title-row">
        <h1 dir="auto">{{ title }}</h1>
        <el-tag size="small" effect="light" :type="isAgent ? 'primary' : 'info'">{{ isAgent ? $t('AI agent') : $t('Workflow') }}</el-tag>
        <div class="grow" />
        <label class="active-switch">
          <span>{{ form.active ? $t('Active') : $t('Inactive') }}</span>
          <el-switch v-model="form.active" :aria-label="$t('Active')" />
        </label>
        <el-dropdown trigger="click" @command="onCommand">
          <el-button text circle :aria-label="$t('More actions')"><el-icon><MoreFilled /></el-icon></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="paste"><el-icon><DocumentCopy /></el-icon>{{ $t('Paste JSON') }}</el-dropdown-item>
              <el-dropdown-item command="copy"><el-icon><CopyDocument /></el-icon>{{ $t('Copy as JSON') }}</el-dropdown-item>
              <el-dropdown-item v-if="!isNew" command="duplicate"><el-icon><CopyDocument /></el-icon>{{ $t('Duplicate') }}</el-dropdown-item>
              <el-dropdown-item v-if="!isNew" command="remove" divided><el-icon><Delete /></el-icon>{{ $t('Delete') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <el-form class="body" @submit.prevent="save">
      <WorkflowIntegrationView
        v-if="!isAgent"
        v-model:trigger="form.trigger"
        v-model:target="form.target"
        v-model:data-manipulation="form.dataManipulation"
        v-model:target-manipulation="form.targetManipulation"
        :integration-id="props.editingIntegration?._id"
      />
      <AIAgentForm
        v-else
        v-model:trigger="form.trigger"
        v-model:target="form.target"
        v-model:data-manipulation="form.dataManipulation"
        :integration-id="props.editingIntegration?._id"
      />
    </el-form>

    <div class="savebar" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="problems.length">{{ $t('{count} required steps left', { count: problems.length }) }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || saving" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="saving" :disabled="!dirty && !isNew" @click="save">{{ isNew ? $t('Create integration') : $t('Save changes') }}</el-button>
    </div>

    <PasteIntegrationDialog v-model:visible="pasteOpen" @apply="applyPasted" />
  </div>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  min-block-size: 100%;
}

.head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 20px 8px;
}

.back {
  margin-inline-start: -10px;
  padding-inline: 10px;
  gap: 4px;
  color: var(--el-text-color-secondary);
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  inline-size: 100%;

  h1 {
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-size: 1.5rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.grow {
  flex: 1;
}

.active-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
  font-size: 0.9rem;
}

.body {
  flex: 1;
  padding: 8px 20px 24px;
}

.savebar {
  position: sticky;
  inset-block-end: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface);
  box-shadow: 0 -6px 16px rgb(0 0 0 / 0.06);

  :deep(.el-button.is-disabled) {
    opacity: 0.45;
  }
}

.state {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 639px) {
  .head {
    padding: 8px 12px 4px;
  }

  .body {
    padding: 8px 12px 24px;
  }

  .savebar {
    padding: 10px 12px;
  }

  .state {
    font-size: 0.82rem;
  }
}
</style>
