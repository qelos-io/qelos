<template>
  <BlueprintForm
    :blueprint="blueprint"
    :submitting="store.submittingUpdateItem"
    :loading="isLoading"
    :identifier-loading="identifierLoading"
    :properties-loading="propertiesLoading"
    @submitted="submit"
  />
</template>
<script lang="ts" setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { IBlueprint } from '@qelos/global-types';
import BlueprintForm from '@/modules/no-code/components/BlueprintForm.vue';

const route = useRoute();
const store = useBlueprintsStore();
const wsConfig = useWsConfiguration();

const { selectedItem, loading } = storeToRefs(store);
const { loaded: wsLoaded } = storeToRefs(wsConfig);

const blueprint = computed<Partial<IBlueprint>>(() => selectedItem.value || {});
const isLoading = computed(() => !wsLoaded.value || loading.value);
const identifierLoading = computed(() => isLoading.value || !selectedItem.value);
const propertiesLoading = computed(() => isLoading.value || !selectedItem.value);

function submit(payload: Partial<IBlueprint>) {
  store.update(route.params.blueprintIdentifier, payload);
}

watch(() => route.params.blueprintIdentifier, async (blueprintIdentifier: string) => {
  if (blueprintIdentifier) {
    store.selectItem(blueprintIdentifier.toString());
  }
}, { immediate: true });
</script>
