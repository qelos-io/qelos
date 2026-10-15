<template>
  <main :style="{ '--ql-reserve': (isEditingEnabled ? editingState.reserve : 0) + 'px' }">
    <PageEditingLayer v-if="isPrivilegedUser" v-model:code-open="codeOpen" :structure="givenStructure" :saved-structure="savedStructure" :extra-tags="extraEditableTags"/>
    <ErrorBoundary v-if="isRequirementsLoaded" @error="reRenderAfterError" :key="$route.fullPath + updates">
      <div class="template-content">
        <VRuntimeTemplate v-if="item"
                          :template="relevantStructure"
                          :template-props="templateProps"/>
      </div>
    </ErrorBoundary>
  </main>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, toRef, toRefs, watch } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import { useAuth } from '@/modules/core/compositions/authentication';
import { fetchAuthUser, isEditingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import sdk from '@/services/sdk';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { useGlobalStyles } from '@/modules/pre-designed/compositions/global-styles';
import PageEditingLayer from '@/modules/pre-designed/components/editing/PageEditingLayer.vue';
import { editingState } from '@/modules/pre-designed/compositions/page-editing';
import { usePluginsStore } from '@/modules/plugins/store/pluginsStore';

const pluginsStore = usePluginsStore();
const mfes = usePluginsMicroFrontends();
const item = ref();
const cruds = toRef(mfes, 'cruds')
const codeOpen = ref(false)

const updates = ref(0)

async function reRenderAfterError() {
  if (updates.value > 5) {
    return;
  }
  await nextTick();
  updates.value++;
}

fetchAuthUser(false, true);
const { user, isLoaded: userLoaded, userPromise } = useAuth()

watch(() => pluginsStore.componentUpdates, () => {
  updates.value++;
});

const { api, crud, relevantStructure, givenStructure, savedStructure, extraEditableTags, styles } = useSingleItemCrud()
const { requirements, isRequirementsLoaded } = toRefs(useScreenRequirementsStore())
useDynamicRouteItem(api, item);
useGlobalStyles(styles);

watch(relevantStructure, () => {
  updates.value++;
})

const templateProps = computed(() => {
  return {
    ...requirements.value,
    row: item.value,
    schema: crud.value.schema,
    cruds: cruds.value,
    user: user.value,
    userLoaded,
    userPromise,
    sdk,
    location,
  };
});

if (isPrivilegedUser.value && !isEditingEnabled.value && relevantStructure.value === '<div></div>') {
  isEditingEnabled.value = true;
}
</script>

<style scoped>
main {
  position: relative;
}

@media (min-width: 721px) {
  main {
    padding-inline-end: var(--ql-reserve, 0px);
    transition: padding-inline-end 0.2s ease;
  }
}

@media (prefers-reduced-motion: reduce) {
  main {
    transition: none;
  }
}
</style>
