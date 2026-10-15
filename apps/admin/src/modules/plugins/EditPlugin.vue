<template>
  <div class="edit-plugin-page" v-if="plugin">
    <PluginEditor :plugin="plugin" :submitting="submitting" :save="updatePlugin" />
  </div>
  <el-skeleton v-else animated :rows="6" class="loading" />
</template>
<script lang="ts" setup>
import PluginEditor from './components/editor/PluginEditor.vue';
import { useEditPlugin } from './compositions/manage-plugin';
import { useRoute } from 'vue-router';

const { plugin, submitting, updatePlugin } = useEditPlugin(useRoute().params.pluginId as string);
</script>
<style scoped>
.loading {
  padding: 24px 20px;
}
</style>
