<template>
  <div v-if="isLoaded" :class="['admin-panel', layoutClass]">
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
    <button v-if="isImpersonating" type="button" class="impersonation-exit-btn" @click="handleExitImpersonation">
      <font-awesome-icon icon="fas fa-user-secret" />
      <span>Exit Impersonation</span>
    </button>

    <component v-if="customComponents.loaded" :is="customComponents.NavigationComponent || Navigation" class="navigation" :opened="navigationOpened" @close="navigationOpened = false" @open="navigationOpened = true"/>
    <div class="admin-content">
      <component
        v-if="customComponents.loaded"
        :is="customComponents.headerComponent || Header"
        @toggle="navigationOpened = !navigationOpened"
        :is-navigation-opened="navigationOpened"
        :show-menu-button="isTablet || (isCompact && !!customComponents.NavigationComponent)"
      />
      <div class="main-wrapper">
        <div class="main">
          <router-view class="main-content"/>
        </div>
        <PrivilegedAddons v-if="isPrivilegedUser"/>
      </div>
    </div>
  </div>
  <CommandPalette v-if="isLoaded" />
  <QuicklyCreateMicrofrontends v-if="isLoaded && isAdmin" v-model="isCreatePageOpen" />
  <template v-if="openModals?.length">
    <MicroFrontendModal v-for="{mfe, props} in openModals" :key="mfe.name" :mfe="mfe" :props="props"/>
  </template>
</template>

<script lang="ts" setup>
import { computed, onBeforeMount, provide, ref, toRef, watch } from 'vue'
import { onBeforeRouteUpdate, useRouter } from 'vue-router'
import { useAuth, useAuthenticatedIntercept } from './compositions/authentication'
import Header from './components/layout/Header.vue'
import Navigation from './components/layout/Navigation.vue'
import CommandPalette from './components/layout/CommandPalette.vue'
import QuicklyCreateMicrofrontends from './components/layout/navigation/QuicklyCreateMicrofrontends.vue'
import { isCreatePageOpen } from './store/shell'
import { useViewport } from './compositions/viewport'
import { authStore, isPrivilegedUser, isEditingEnabled, isAdmin } from '@/modules/core/store/auth';
import { isImpersonating, clearImpersonation } from '@/modules/core/store/impersonation';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import MicroFrontendModal from '@/modules/plugins/components/MicroFrontendModal.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import PrivilegedAddons from '@/modules/admins/components/PrivilegedAddons.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { shouldShowBuilderTheme } from '@/modules/builder/store/builderTheme';
import BuilderEditingLayer from '@/modules/builder/components/BuilderEditingLayer.vue';
import { useRoute } from 'vue-router';
import { useStaticComponentsStore } from '../no-code/store/static-components'

const router = useRouter()
const route = useRoute();
const { appConfig } = useAppConfiguration();
const wsConfig = useWsConfiguration()
const workspacesStore = useWorkspacesList()
const invitesStore = useInvitesList()
const { user } = useAuth();

const customComponents = useStaticComponentsStore()

provide('user', user);
provide('wsConfig', toRef(wsConfig, 'metadata'));

const navigationOpened = ref(false)
const { isCompact, isTablet } = useViewport()
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
  if (!isAdmin.value) return false;
  // Show builder components on all pages for admin users on desktop
  // except for specific pages where it shouldn't appear (like login, etc.)
  const excludedRoutes = ['/login', '/register', '/forgot-password'];
  const isExcludedRoute = excludedRoutes.some(excludedRoute => route.path.startsWith(excludedRoute));
  
  return shouldShowBuilderTheme.value && !isExcludedRoute;
});

router.afterEach(() => navigationOpened.value = false);
watch([isCompact, isTablet], () => navigationOpened.value = false);

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
  flex-direction: row;
  inline-size: 100%;
  block-size: 100%;
  background: linear-gradient(to right bottom, var(--border-color) 20%, var(--body-bg) 80%);
}

.navigation {
  align-self: stretch;
}

.admin-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
  block-size: 100%;

  .main {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: auto;
    border: var(--layout-main-border, 0);
    background: var(--layout-main-bg, transparent);
    border-radius: var(--layout-main-radius, var(--border-radius));
    margin: var(--layout-main-margin, 0);
    padding: var(--layout-main-padding, 0);
    box-shadow: var(--layout-main-shadow, none);
    transition: border 160ms ease, box-shadow 200ms ease;
  }

  .main-content {
    inline-size: 100%;
    block-size: 100%;
  }
}

.main-wrapper {
  display: flex;
  flex: 1;
  flex-direction: row;
  min-block-size: 0;
  max-inline-size: calc(100vw - var(--nav-width));
  overflow: auto;
}

// phones: the navigation is a bottom tab bar + sheet, so the content gets the whole width
@media (max-width: 639px) {
  .admin-panel {
    flex-direction: column;
  }

  .main-wrapper {
    max-inline-size: 100vw;
    // keep the end of every page clear of the fixed tab bar
    padding-block-end: calc(64px + env(safe-area-inset-bottom, 0px));
  }
}

// Impersonation exit button
@media (max-width: 639px) {
  .impersonation-exit-btn {
    inset-block-start: auto !important;
    inset-block-end: calc(76px + env(safe-area-inset-bottom, 0px));
  }
}

.impersonation-exit-btn {
  position: fixed;
  inset-block-start: 80px;
  inset-inline-end: 20px;
  border: 0;
  font-family: inherit;
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
