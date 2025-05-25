<template>
  <VRuntimeTemplate :template="template" :template-props="templateProps"/>
</template>
<script lang="ts" setup>
import { computed, getCurrentInstance } from 'vue';
import VRuntimeTemplate from 'vue3-runtime-template';
import { authStore } from '@/modules/core/store/auth';
import sdk from '@/services/sdk';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';

const { appConfig } = useAppConfiguration()

const props = defineProps({
  template: String,
  templateProps: Object,
  components: Object,
});

const vm = getCurrentInstance();

vm.proxy.$options.components = {
  ...props.components
}

const templateProps = computed(() => {
  return {
    user: authStore.user || null,
    sdk,
    location,
    appConfig,
    ...props.templateProps
  };
});
</script>
