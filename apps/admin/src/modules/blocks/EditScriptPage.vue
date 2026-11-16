<template>
  <div v-if="loading" class="loading"><el-skeleton animated :rows="6" /></div>

  <ComponentWorkspace v-else-if="component" kind="script" ref="workspace" :key="component._id" :component="component" :saving="saving" :compile-error="compileError" @submitted="submit" />

  <el-empty v-else :description="$t('Script not found')" :image-size="160">
    <el-button type="primary" @click="router.push({ name: 'components' })">{{ $t('Back to components') }}</el-button>
  </el-empty>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { IScript } from '@qelos/sdk/src/administrator/scripts';
import scriptsService from '@/services/apis/scripts-service';
import ComponentWorkspace from './components/ComponentWorkspace.vue';
import { useComponentSave } from './compositions/component-save';
import { useScriptsList } from './store/scripts-list';

const route = useRoute();
const router = useRouter();
const scriptId = route.params.scriptId as string;
const scriptsStore = useScriptsList();
const { saving, compileError, run } = useComponentSave();

const component = ref<IScript | null>(null);
const loading = ref(true);
const workspace = ref<InstanceType<typeof ComponentWorkspace>>();

scriptsService
  .getOne(scriptId)
  .then((data) => (component.value = data))
  .catch(() => (component.value = null))
  .finally(() => (loading.value = false));

async function submit(payload: { identifier: string; description: string; content: string }) {
  const updated = await run(() => scriptsService.update(scriptId, payload), 'Failed to update script');
  if (!updated) return;
  ElMessage.success('Script updated successfully');
  component.value = { ...component.value, ...payload, ...(updated as object) } as IScript;
  workspace.value?.markSaved();
  scriptsStore.retry();
}
</script>

<style scoped>
.loading {
  padding: 24px;
}
</style>
