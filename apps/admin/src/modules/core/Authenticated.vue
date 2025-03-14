<template>
  <div class="admin-panel" v-if="isLoaded">
    <Navigation class="navigation" :opened="navigationOpened" @close="navigationOpened = false"/>
    <div class="admin-content">
      <Header class="header" @open="navigationOpened = true"/>
      <div class="main">
        <router-view class="main-content"/>
      </div>
      <AssetsDetailsPanel v-if="isPrivilegedUser && (isManagingEnabled || isEditingEnabled)"/>
    </div>
  </div>
  <template v-if="openModals?.length">
    <MicroFrontendModal v-for="{mfe, props} in openModals" :key="mfe.name" :mfe="mfe" :props="props"/>
  </template>
  <LiveEditManager/>
</template>

<script lang="ts" setup>
import { onBeforeMount, ref, toRef, watch } from 'vue'
import { useAuth, useAuthenticatedIntercept } from './compositions/authentication'
import Header from './components/layout/Header.vue'
import Navigation from './components/layout/Navigation.vue'
import AssetsDetailsPanel from '@/modules/assets/components/AssetsDetailsPanel/AssetsDetailsPanel.vue'
import { onBeforeRouteUpdate, useRouter } from 'vue-router'
import { authStore, isEditingEnabled, isManagingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import MicroFrontendModal from '@/modules/plugins/components/MicroFrontendModal.vue';
import LiveEditManager from '@/modules/layouts/components/live-edit/LiveEditManager.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import useInvitesList from '@/modules/workspaces/store/invites-list';

const router = useRouter()
const wsConfig = useWsConfiguration()
const workspacesStore = useWorkspacesList()
const invitesStore = useInvitesList()
const { user } = useAuth();

const navigationOpened = ref(false)
const { isLoaded } = useAuthenticatedIntercept();
const openModals = toRef(usePluginsMicroFrontends(), 'openModals');

router.afterEach(() => navigationOpened.value = false);

onBeforeRouteUpdate(async (to, from) => {
  await authStore.userPromise;
  if (to.name === 'createMyWorkspace' || to.name === 'workspaces' || isPrivilegedUser.value) {
    return;
  }
  if (wsConfig.isActive && !user.value.workspace) {
    await invitesStore.promise;
    if (invitesStore.invites.length) {
      return { name: 'workspaces' }
    }
    return { name: 'createMyWorkspace' };
  }
  return;
})
onBeforeMount(async () => {
  await wsConfig.promise;
  await authStore.userPromise;
  if (wsConfig.isActive && !authStore.user.workspace) {
    await workspacesStore.promise;
    if (workspacesStore.workspaces.length) {
      await workspacesStore.activateSilently(workspacesStore.workspaces[0])
    } else {
      await invitesStore.promise;
      await router.push({ name: invitesStore.invites.length ? 'workspaces' : 'createMyWorkspace' });
    }
  }
});

watch(navigationOpened, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
})
</script>
<style scoped lang="scss">
.admin-panel {
  display: flex;

  width: 100%;
  height: 100%;
  flex-direction: row;
  background-color: var(--body-bg);
}

.admin-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    background-color: var(--body-bg);
    padding-bottom: 0;
    position: relative;
  }

  .main-content {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: 600px) {
  .admin-panel {
    flex-direction: column;
  }
}
</style>
