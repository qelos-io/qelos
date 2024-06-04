<template>
  <div>
    <PluginForm :plugin="plugin" :submitting="submitting" @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import PluginForm from './components/PluginForm.vue';
import { useCreatePlugin } from './compositions/manage-plugin';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';

const { plugin, submitting, savePlugin } = useCreatePlugin();
const store = usePluginsList()

const save = async (data) => {
  await savePlugin(data)
  store.retry();
}
</script>
