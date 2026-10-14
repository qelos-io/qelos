<template>
  <div v-if="loading" class="loading"><el-skeleton animated :rows="6" /></div>

  <ComponentWorkspace v-else-if="component" ref="workspace" :key="component._id" :component="component" :saving="saving" :compile-error="compileError" @submitted="submit" />

  <el-empty v-else :description="$t('Component not found')" :image-size="160">
    <el-button type="primary" @click="router.push({ name: 'components' })">{{ $t('Back to components') }}</el-button>
  </el-empty>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { INoCodeComponent } from '@qelos/global-types';
import componentsService from '@/services/apis/components-service';
import ComponentWorkspace from './components/ComponentWorkspace.vue';
import { useComponentSave } from './compositions/component-save';
import { useComponentsList } from './store/components-list';
import { useStaticComponentsStore } from '@/modules/no-code/store/static-components';

const route = useRoute();
const router = useRouter();
const componentId = route.params.componentId as string;
const componentsStore = useComponentsList();
const staticComponents = useStaticComponentsStore();
const { saving, compileError, run } = useComponentSave();

const component = ref<INoCodeComponent | null>(null);
const loading = ref(true);
const workspace = ref<InstanceType<typeof ComponentWorkspace>>();

componentsService
  .getOne(componentId)
  .then((data) => (component.value = data))
  .catch(() => (component.value = null))
  .finally(() => (loading.value = false));

async function submit(payload: { componentName: string; identifier: string; description: string; content: string }) {
  const updated = await run(() => componentsService.update(componentId, payload), 'Failed to update component');
  if (!updated) return;
  ElMessage.success('Component updated successfully');
  component.value = { ...component.value, ...payload, ...(updated as object) } as INoCodeComponent;
  workspace.value?.markSaved();
  componentsStore.retry();
  // refresh the compiled list so the preview shows the new bundle
  await staticComponents.retry();
}
</script>

<style scoped>
.loading {
  padding: 24px;
}
</style>
