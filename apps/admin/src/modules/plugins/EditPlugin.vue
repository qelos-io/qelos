<template>
  <div class="edit-plugin-page" v-if="plugin">
    <PluginForm :plugin="plugin" :submitting="submitting" @submitted="updatePlugin"/>
  </div>
</template>
<script lang="ts" setup>
import PluginForm from './components/PluginForm.vue';
import { useEditPlugin } from './compositions/manage-plugin';
import { useRoute } from 'vue-router';

const { plugin, submitting, updatePlugin } = useEditPlugin(useRoute().params.pluginId as string);
</script>
