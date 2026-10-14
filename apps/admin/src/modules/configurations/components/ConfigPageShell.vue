<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { provideConfigShell } from '../compositions/config-shell';
import { getConfigurationInfo } from '../services/configuration-registry';

const props = defineProps<{
  configKey: string;
  isPublic?: boolean | undefined;
  submitting?: boolean;
  /** changes every time a save succeeds */
  savedToken?: number;
}>();

const { t } = useI18n();
const router = useRouter();
const root = ref<HTMLElement>();

const info = computed(() => getConfigurationInfo(props.configKey));
const title = computed(() => (info.value ? t(info.value.title) : props.configKey));
const description = computed(() => (info.value ? t(info.value.description) : ''));

const { dirty, hasForm, discard, markSaved } = provideConfigShell();

const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.savedToken,
  () => {
    markSaved();
    justSaved.value = true;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (justSaved.value = false), 2500);
  },
);

function save() {
  root.value?.querySelector('form')?.requestSubmit();
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (hasForm.value && !props.submitting) save();
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
</script>

<template>
  <div ref="root" class="shell">
    <header class="head">
      <el-button text class="back" :aria-label="$t('Back to settings')" @click="router.push({ name: 'configurations' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
        <span>{{ $t('Settings') }}</span>
      </el-button>
      <div class="title-row">
        <h1 dir="auto">{{ title }}</h1>
        <el-tag v-if="isPublic !== undefined" :type="isPublic ? 'success' : 'info'" effect="light" size="small">{{ isPublic ? $t('Public') : $t('Private') }}</el-tag>
      </div>
      <p v-if="description" class="description">{{ description }}</p>
    </header>

    <div class="body"><slot /></div>

    <div v-if="hasForm" class="savebar" :class="{ dirty }" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="justSaved"><font-awesome-icon :icon="['fas', 'check']" class="ok" aria-hidden="true" />{{ $t('All changes saved') }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || submitting" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!dirty" @click="save">{{ $t('Save changes') }}</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shell {
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
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    line-height: 1.25;
  }
}

.description {
  margin: 2px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  text-align: start;
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
}

.savebar :deep(.el-button.is-disabled) {
  opacity: 0.45;
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
