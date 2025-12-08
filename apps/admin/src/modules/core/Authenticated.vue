<template>
  <div v-if="isLoaded" :class="['admin-panel', layoutClass]">
    <Navigation class="navigation" :opened="navigationOpened" @close="navigationOpened = false"/>
    <div class="admin-content">
      <Header @toggle="navigationOpened = !navigationOpened" :is-navigation-opened="navigationOpened"/>
      <div class="main-wrapper">
        <div class="main">
          <router-view class="main-content"/>
        </div>
        <PrivilegedAddons v-if="isPrivilegedUser"/>
      </div>
    </div>
  </div>
  <template v-if="openModals?.length">
    <MicroFrontendModal v-for="{mfe, props} in openModals" :key="mfe.name" :mfe="mfe" :props="props"/>
  </template>
</template>

<script lang="ts" setup>
import { computed, onBeforeMount, ref, toRef, watch } from 'vue'
import { onBeforeRouteUpdate, useRouter } from 'vue-router'
import { useAuth, useAuthenticatedIntercept } from './compositions/authentication'
import Header from './components/layout/Header.vue'
import Navigation from './components/layout/Navigation.vue'
import { authStore, isPrivilegedUser } from '@/modules/core/store/auth';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import MicroFrontendModal from '@/modules/plugins/components/MicroFrontendModal.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import PrivilegedAddons from '@/modules/admins/components/PrivilegedAddons.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';

const router = useRouter()
const { appConfig } = useAppConfiguration();
const wsConfig = useWsConfiguration()
const workspacesStore = useWorkspacesList()
const invitesStore = useInvitesList()
const { user } = useAuth();

const navigationOpened = ref(false)
const { isLoaded } = useAuthenticatedIntercept();
const openModals = toRef(usePluginsMicroFrontends(), 'openModals');
const layoutStyle = computed(() => appConfig.value.layoutStyle || 'classic');
const layoutClass = computed(() => `layout-${layoutStyle.value}`);

router.afterEach(() => navigationOpened.value = false);

onBeforeRouteUpdate(async (to, from) => {
  await authStore.userPromise;
  if (to.name === 'createMyWorkspace' || to.name === 'workspaces' || isPrivilegedUser.value) {
    return;
  }
  if (!wsConfig.metadata.allowNonWorkspaceUsers && wsConfig.isActive && !user.value.workspace) {
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
    } else if (!wsConfig.metadata.allowNonWorkspaceUsers) {
      await invitesStore.promise;
      await router.push({ name: invitesStore.invites.length ? 'workspaces' : 'createMyWorkspace' });
    }
  }
});

watch(navigationOpened, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
})

watch(() => user.value?.roles, () => {
  document.querySelector('html')?.setAttribute('data-roles', user.value?.roles?.join(',') || '');
}, { immediate: true });

watch(layoutStyle, (style) => {
  document.body.setAttribute('data-layout-style', style);
}, { immediate: true });

</script>
<style scoped lang="scss">
.admin-panel {
  display: flex;

  width: 100%;
  height: 100%;
  flex-direction: row;
  background: linear-gradient(to right bottom, var(--border-color) 20%, var(--body-bg) 80%);
}

.main-wrapper {
  max-width: calc(100vw - var(--nav-width));
  display: flex;
  flex-direction: row;
  flex: 1;
  height: calc(100% - 60px);
  overflow: auto;
  order: 2;
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
    padding-bottom: 0;
    position: relative;
    border: var(--layout-main-border, 0);
    background: var(--layout-main-bg, transparent);
    border-radius: var(--layout-main-radius, var(--border-radius));
    margin: var(--layout-main-margin, 0);
    padding: var(--layout-main-padding, 0);
    box-shadow: var(--layout-main-shadow, none);
    transition: border 160ms ease, box-shadow 200ms ease;
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
  
  .admin-content {
    display: flex;
    flex-direction: column;
  }
  
  .navigation {
    order: 1;
    width: 100%;
    position: relative;
    left: 0;
    z-index: 90;
  }
  
  .header {
    order: 2;
    z-index: 80;
  }
  
  .main {
    order: 3;
  }
}
</style>
