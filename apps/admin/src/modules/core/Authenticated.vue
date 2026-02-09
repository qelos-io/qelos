<template>
  <div v-if="isLoaded" :class="['admin-panel', layoutClass]">
    <!-- Builder theme components -->
    <BuilderNavigationDrawer v-if="shouldShowBuilderComponents" />
    <BuilderEditingLayer
      v-if="shouldShowBuilderComponents"
      :page-name="currentPageName"
      :is-editing-enabled="isEditingEnabled"
      :toggle-edit="() => isEditingEnabled = !isEditingEnabled"
      :submitting="false"
      :show-code-editor="false"
      :open-add-component-modal="() => {}"
      :open-code-editor="() => {}"
      :clone-page="() => {}"
      :remove-page="() => {}"
      :save-code-editor="() => {}"
      :close-code-editor="() => {}"
      @preview-mode="handlePreviewMode"
      @toggle-guides="handleToggleGuides"
      @inspect-mode="handleInspectMode"
      @page-settings="handlePageSettings"
    />
    
    <!-- Fixed impersonation exit button -->
    <div v-if="isImpersonating" class="impersonation-exit-btn" @click="handleExitImpersonation">
      <font-awesome-icon icon="fas fa-user-secret" />
      <span>Exit Impersonation</span>
    </div>
    
    <!-- Regular navigation (always visible for regular users, shown alongside builder for admins) -->
    <Navigation class="navigation" :opened="navigationOpened" @close="navigationOpened = false"/>
    <div class="admin-content" :class="{ 'has-builder-drawer': shouldShowBuilderComponents }">
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
import { authStore, isPrivilegedUser, isEditingEnabled } from '@/modules/core/store/auth';
import { isImpersonating, clearImpersonation } from '@/modules/core/store/impersonation';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import MicroFrontendModal from '@/modules/plugins/components/MicroFrontendModal.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import PrivilegedAddons from '@/modules/admins/components/PrivilegedAddons.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { shouldShowBuilderTheme } from '@/modules/builder/store/builderTheme';
import BuilderNavigationDrawer from '@/modules/builder/components/BuilderNavigationDrawer.vue';
import BuilderEditingLayer from '@/modules/builder/components/BuilderEditingLayer.vue';
import { useRoute } from 'vue-router';

const router = useRouter()
const route = useRoute();
const { appConfig } = useAppConfiguration();
const wsConfig = useWsConfiguration()
const workspacesStore = useWorkspacesList()
const invitesStore = useInvitesList()
const { user } = useAuth();

const navigationOpened = ref(false)
const { isLoaded } = useAuthenticatedIntercept();
const openModals = toRef(usePluginsMicroFrontends(), 'openModals');
const layoutStyle = computed(() => appConfig.value.layoutStyle || 'classic');
const navigationLayout = computed(() => appConfig.value.navigationLayout || 'icon-text');
const layoutClass = computed(() => `layout-${layoutStyle.value}`);

// Builder theme computed properties
const currentPageName = computed(() => {
  return (route.meta?.title as string) || (route.name as string) || 'Unknown Page';
});

const shouldShowBuilderComponents = computed(() => {
  // Show builder components on all pages for admin users on desktop
  // except for specific pages where it shouldn't appear (like login, etc.)
  const excludedRoutes = ['/login', '/register', '/forgot-password'];
  const isExcludedRoute = excludedRoutes.some(excludedRoute => route.path.startsWith(excludedRoute));
  
  return shouldShowBuilderTheme.value && !isExcludedRoute;
});

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

watch(navigationLayout, (layout) => {
  document.body.setAttribute('data-navigation-layout', layout);
}, { immediate: true });

// Builder theme event handlers
function handlePreviewMode() {
  // Implement preview mode logic
  console.log('Preview mode activated');
}

function handleToggleGuides() {
  // Implement guides toggle logic
  console.log('Guides toggled');
}

function handleInspectMode() {
  // Implement inspect mode logic
  console.log('Inspect mode activated');
}

function handlePageSettings() {
  // Implement page settings logic
  console.log('Page settings opened');
}

function handleExitImpersonation() {
  clearImpersonation();
  window.location.reload();
}

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
  
  // Adjust for builder drawer
  &.has-builder-drawer {
    max-width: calc(100vw - var(--builder-drawer-width, 280px));
  }
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
  }
  
  .header {
    order: 2;
    z-index: 80;
  }
  
  .main {
    order: 3;
  }
}

// Impersonation exit button
.impersonation-exit-btn {
  position: fixed;
  top: 80px;
  inset-inline-end: 20px;
  background: var(--el-color-warning);
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--el-color-warning-dark-2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
}
</style>
