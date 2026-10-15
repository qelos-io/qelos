<template>
  <PluginEditor :submitting="submitting" :save="create" />
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import PluginEditor from './components/editor/PluginEditor.vue';
import { useCreatePlugin } from './compositions/manage-plugin';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { IPlugin } from '@qelos/global-types';

const router = useRouter();
const { submitting, savePlugin } = useCreatePlugin();
const store = usePluginsList();

async function create(data: Partial<IPlugin>) {
  const created = await savePlugin(data);
  if (!created) return undefined;
  store.retry();
  router.push({ name: 'editPlugin', params: { pluginId: created._id } });
  return created;
}
</script>
