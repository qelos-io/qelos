<template>
  <div>
    <PluginForm :plugin="plugin" :submitting="submitting" @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import PluginForm from './components/PluginForm.vue';
import { useCreatePlugin } from './compositions/manage-plugin';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { IPlugin } from '@qelos/global-types';

const router = useRouter();

const { plugin, submitting, savePlugin } = useCreatePlugin();
const store = usePluginsList()

const save = async (data: Partial<IPlugin>) => {
  const plugin = await savePlugin(data)
  store.retry();
  router.push({ name: 'editPlugin', params: { pluginId: plugin._id } });
}
</script>
