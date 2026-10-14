<template>
  <ComponentWorkspace ref="workspace" :saving="saving" :compile-error="compileError" @submitted="submit" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import ComponentWorkspace from './components/ComponentWorkspace.vue';
import componentsService from '@/services/apis/components-service';
import { useComponentSave } from './compositions/component-save';
import { useComponentsList } from './store/components-list';
import { useStaticComponentsStore } from '@/modules/no-code/store/static-components';

const router = useRouter();
const workspace = ref<InstanceType<typeof ComponentWorkspace>>();
const componentsStore = useComponentsList();
const staticComponents = useStaticComponentsStore();
const { saving, compileError, run } = useComponentSave();

async function submit(payload: { componentName: string; identifier: string; description: string; content: string }) {
  const created = await run(() => componentsService.create(payload), 'Failed to create component');
  if (!created) return;
  ElMessage.success('Component created successfully');
  workspace.value?.markSaved();
  componentsStore.retry();
  staticComponents.retry();
  // keep working on the component that was just created
  router.replace({ name: 'editComponent', params: { componentId: created._id } });
}
</script>
