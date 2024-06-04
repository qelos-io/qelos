<template>
  <EditHeader>
    {{ $t(plugin._id ? 'Edit Plugin' : 'Create Plugin') }}<strong>{{ plugin.name }}</strong>
  </EditHeader>
</template>
<script lang="ts" setup>
import { IPlugin } from '@/services/types/plugin';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';

defineProps({
  plugin: Object as () => any & Partial<IPlugin>,
})
</script>
