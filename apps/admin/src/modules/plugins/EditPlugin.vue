<template>
  <div class="edit-plugin-page" v-if="plugin">
    <PluginForm :plugin="plugin" :submitting="submitting" @submitted="update"/>
  </div>
</template>
<script lang="ts" setup>
import PluginForm from './components/PluginForm.vue';
import {useEditPlugin} from './compositions/manage-plugin';
import {useRoute} from 'vue-router';
import pluginsService from '@/services/plugins-service';
import {usePluginsList} from '@/modules/plugins/store/plugins-list';

const {plugin, submitting} = useEditPlugin(useRoute().params.pluginId as string);
const store = usePluginsList()

async function update(changes) {
  plugin.value = await pluginsService.update(plugin.value._id, changes);
  store.retry();
}
</script>
