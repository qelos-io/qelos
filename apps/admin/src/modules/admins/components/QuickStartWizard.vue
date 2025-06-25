<script setup lang="ts">
import { onBeforeMount, ref, toRefs } from 'vue';
import { useToursStore } from '@/modules/core/store/tours';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';

const formVisible = ref(false);

const toursStore = useToursStore();
onBeforeMount(async () => {
  await toursStore.setCurrentTour('quick-start', 1);
  formVisible.value = toursStore.tourOpen;
});

const { appConfig, promise: appConfigPromise } = useAppConfiguration();
const { isActive, promise: wsConfigPromise } = toRefs(useWsConfiguration());
const { promise: integrationPromise, integrations } = toRefs(useIntegrationSourcesStore());

onBeforeMount(async () => {
  await Promise.all([appConfigPromise, wsConfigPromise.value, integrationPromise.value]);
});

function closeForm() {
  if (toursStore.tourOpen) {
    toursStore.tourFinished();
  }
}

</script>

<template>
  <div><el-button text @click="formVisible = true">{{ $t('Quick Start') }}</el-button></div>
  <el-dialog append-to-body v-model="formVisible" :title="$t('Quick Start')"
             width="50%"
             @close="closeForm">
  
  </el-dialog>
</template>

<style scoped>
img {
  max-height: 50px;
  max-width: 100px;
}
</style>