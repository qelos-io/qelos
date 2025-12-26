<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { IMicroFrontend } from '@/services/types/plugin';

const props = defineProps<{ url: string, plugin?: string, apiPath?: string }>()

const store = usePluginsList();
const route = useRoute();

const pluginId = computed(() => 
props.plugin || 
(route.meta?.mfe as IMicroFrontend)?.pluginId || 
store.plugins?.find(p => p.apiPath === props.apiPath)?._id);

const link = computed(() => `/api/plugins/${pluginId.value}/callback?returnUrl=` + btoa(props.url))
</script>

<template>
  <a :href="link"><slot/></a>
</template>