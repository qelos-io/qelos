<template>
  <BlueprintEditor
    :blueprint="blueprint"
    :submitting="store.submittingUpdateItem"
    :loading="isLoading"
    :save="save"
  />
</template>
<script lang="ts" setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { IBlueprint } from '@qelos/global-types';
import BlueprintEditor from '@/modules/no-code/components/editor/BlueprintEditor.vue';

const route = useRoute();
const store = useBlueprintsStore();
const wsConfig = useWsConfiguration();

const { selectedItem, loading } = storeToRefs(store);
const { loaded: wsLoaded } = storeToRefs(wsConfig);

const blueprint = computed<Partial<IBlueprint>>(() => selectedItem.value || {});
const isLoading = computed(() => !wsLoaded.value || loading.value || !selectedItem.value);

const save = (payload: Partial<IBlueprint>) => store.update(route.params.blueprintIdentifier, payload);

watch(() => route.params.blueprintIdentifier, (blueprintIdentifier: string) => {
  if (blueprintIdentifier) store.selectItem(blueprintIdentifier.toString());
}, { immediate: true });
</script>
