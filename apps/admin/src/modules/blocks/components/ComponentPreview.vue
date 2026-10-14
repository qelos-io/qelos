<script lang="ts" setup>
import { computed, onErrorCaptured, ref, watch } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useStaticComponentsStore } from '@/modules/no-code/store/static-components';
import { parsePropsJson } from '../services/library';

/**
 * Renders a saved component from the no-code service's compiled output (the same JIT-loaded bundle
 * the rest of the app uses), so what you see here is what a page would render.
 */
const props = defineProps<{ componentName?: string; propsText: string; stale?: boolean }>();

const store = useStaticComponentsStore();
const entry = computed(() => store.staticComponents.find((component) => component.name === props.componentName));
const compiled = computed(() => store.result?.components?.find((component) => component.componentName === props.componentName));
const parsed = computed(() => parsePropsJson(props.propsText));

const renderError = ref('');
const reloading = ref(false);

// a new compiled bundle (new URL) or new props start from a clean slate
watch([() => compiled.value?.js, () => props.propsText], () => (renderError.value = ''));

onErrorCaptured((error: any) => {
  renderError.value = error?.message || String(error);
  return false;
});

async function reload() {
  reloading.value = true;
  renderError.value = '';
  try {
    await store.retry();
  } finally {
    reloading.value = false;
  }
}
</script>

<template>
  <div class="preview">
    <p v-if="!componentName" class="note">{{ $t('Save the component to see it rendered here.') }}</p>

    <template v-else-if="!entry">
      <p class="note">{{ $t('This component is not in the compiled list yet. It appears after a successful compile.') }}</p>
      <el-button size="small" :loading="reloading" @click="reload"><el-icon><Refresh /></el-icon>{{ $t('Reload the list') }}</el-button>
    </template>

    <template v-else>
      <el-alert v-if="stale" type="warning" show-icon :closable="false" :title="$t('Showing the last saved version. Save to update the preview.')" class="stale" />
      <el-alert v-if="parsed.error" type="error" show-icon :closable="false" :title="$t(parsed.error)" class="stale" />

      <div v-if="renderError" class="render-error" role="alert">
        <strong>{{ $t('The component failed to render') }}</strong>
        <pre dir="ltr">{{ renderError }}</pre>
        <el-button size="small" @click="renderError = ''">{{ $t('Try again') }}</el-button>
      </div>

      <div v-else :key="compiled?.js + propsText" class="stage">
        <component :is="entry.component" v-bind="parsed.value" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-block-size: 100%;
}

.note {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.stage {
  min-block-size: 160px;
  padding: 16px;
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.render-error {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 8px;
  background: var(--el-color-danger-light-9);

  pre {
    margin: 0;
    max-inline-size: 100%;
    overflow: auto;
    font-size: 12px;
    white-space: pre-wrap;
  }
}
</style>
