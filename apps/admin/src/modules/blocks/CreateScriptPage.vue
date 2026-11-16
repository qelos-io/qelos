<template>
  <ComponentWorkspace kind="script" ref="workspace" :initial-folder="initialFolder" :saving="saving" :compile-error="compileError" @submitted="submit" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { normalizeScriptIdentifier } from './services/library';
import { ElMessage } from 'element-plus';
import ComponentWorkspace from './components/ComponentWorkspace.vue';
import scriptsService from '@/services/apis/scripts-service';
import { useComponentSave } from './compositions/component-save';
import { useScriptsList } from './store/scripts-list';

const route = useRoute();
const router = useRouter();
// the folder the "New script" button was pressed in
const initialFolder = normalizeScriptIdentifier(String(route.query.folder || ''));
const workspace = ref<InstanceType<typeof ComponentWorkspace>>();
const scriptsStore = useScriptsList();
const { saving, compileError, run } = useComponentSave();

async function submit(payload: { identifier: string; description: string; content: string }) {
  const created = await run(() => scriptsService.create({ ...payload, type: 'script' } as any), 'Failed to create script');
  if (!created) return;
  ElMessage.success('Script created successfully');
  workspace.value?.markSaved();
  scriptsStore.retry();
  // keep working on the component that was just created
  router.replace({ name: 'editScript', params: { scriptId: created._id } });
}
</script>
