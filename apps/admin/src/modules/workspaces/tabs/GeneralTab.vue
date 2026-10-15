<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import WorkspaceAvatar from '../components/WorkspaceAvatar.vue';

defineOptions({ inheritAttrs: false });
const props = defineProps<{ workspace: any; submitting?: boolean; workspaceId?: string; save: (data: Record<string, unknown>) => Promise<unknown> }>();

const { t } = useI18n();
const wsConfig = useWsConfiguration();

const fromWorkspace = () => ({ name: props.workspace.name || '', logo: props.workspace.logo || '' });
const draft = reactive(fromWorkspace());
const baseline = ref(JSON.stringify(draft));
const dirty = computed(() => JSON.stringify(draft) !== baseline.value);
const error = ref('');
const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;

async function submit() {
  if (props.submitting) return;
  if (!draft.name.trim()) {
    error.value = t('Workspace name is required');
    return;
  }
  error.value = '';
  const patch: Record<string, unknown> = { name: draft.name.trim() };
  if (wsConfig.metadata.allowLogo) patch.logo = draft.logo || '';
  const result = await props.save(patch);
  if (!result) return;
  baseline.value = JSON.stringify(draft);
  justSaved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = false), 2500);
  return result;
}

function discard() {
  Object.assign(draft, JSON.parse(baseline.value));
  error.value = '';
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    submit();
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
  clearTimeout(savedTimer);
});
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'), { type: 'warning', confirmButtonText: t('Leave'), cancelButtonText: t('Stay') });
    return true;
  } catch {
    return false;
  }
});
</script>

<template>
  <div class="general">
    <el-form label-position="top" class="form" @submit.prevent="submit">
      <el-form-item :label="$t('Workspace name')" :error="error || undefined">
        <el-input v-model="draft.name" dir="auto" maxlength="120" :placeholder="$t('Enter workspace name')" />
      </el-form-item>
      <el-form-item v-if="wsConfig.metadata.allowLogo" :label="$t('Logo')">
        <div class="logo-row">
          <WorkspaceAvatar :name="draft.name" :logo="draft.logo" :size="64" />
          <div class="logo-field"><FormInput v-model="draft.logo" type="upload" :upload-config="{ isImage: true }" /></div>
          <el-button v-if="draft.logo" text type="danger" @click="draft.logo = ''">{{ $t('Remove logo') }}</el-button>
        </div>
      </el-form-item>
    </el-form>

    <div class="savebar" :class="{ dirty }" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="justSaved"><font-awesome-icon :icon="['fas', 'check']" class="ok" aria-hidden="true" />{{ $t('All changes saved') }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || submitting" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!dirty" @click="submit">{{ $t('Save changes') }}</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.form {
  max-inline-size: 560px;

  :deep(.el-form-item) {
    margin-block-end: 26px;
  }
}

.logo-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.logo-field {
  min-inline-size: 220px;
}

.savebar {
  display: flex;
  align-items: center;
  gap: 10px;
  max-inline-size: 560px;
  padding-block: 8px;
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

.dirty .state {
  color: var(--el-text-color-primary);
}

.dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.ok {
  color: var(--el-color-success);
}
</style>
