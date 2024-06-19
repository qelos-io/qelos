<template>
  <div v-if="wsConfig.loaded && store.selectedItem">
    <BlueprintForm :blueprint="store.selectedItem" :submitting="store.submittingUpdateItem" @submitted="submit"/>
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { IBlueprint } from '@qelos/global-types';
import BlueprintForm from '@/modules/no-code/components/BlueprintForm.vue';

const route = useRoute();
const store = useBlueprintsStore();
const wsConfig = useWsConfiguration();

function submit(payload: Partial<IBlueprint>) {
  store.update(route.params.blueprintIdentifier, payload);
}

watch(() => route.params.blueprintIdentifier, async (blueprintIdentifier: string) => {
  if (blueprintIdentifier) {
    store.selectItem(blueprintIdentifier.toString());
  }
}, { immediate: true });
</script>
