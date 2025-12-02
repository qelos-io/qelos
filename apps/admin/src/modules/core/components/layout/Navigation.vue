<template>
  <nav :class="{ show: opened, collapsed: isCollapsed && !opened }">
    <div class="mobile-mask" @click="close"/>
    <div class="nav-header">
      <router-link to="/" class="home-logo">
        <img :alt="appConfig.name" :src="appConfig.logoUrl" class="logo-image">
        <img v-if="appConfig.smallLogoUrl" :src="appConfig.smallLogoUrl" class="small-logo-image" :alt="appConfig.name">
      </router-link>
      <button class="collapse-toggle" @click="toggleCollapse" v-if="!$isMobile" :title="isCollapsed ? $t('Expand menu') : $t('Collapse menu')">
        <el-icon>
          <font-awesome-icon :icon="['fas', isCollapsed ? 'angle-right' : 'angle-left']"/>
        </el-icon>
      </button>
    </div>

    <el-menu router :default-active="$route.path" :collapse="isCollapsed && !opened" :collapse-transition="false" class="el-menu-vertical" :ellipsis="false">
      <div class="nav-group" v-if="isEditingEnabled || (isAdmin && !hasPages)">
        <el-menu-item id="menu-item-create-new-page" @click="openDrawer" :data-title="$t('Create New Page')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'plus-circle']"/>
          </el-icon>
          <span>{{ $t('Create New Page') }}</span>
        </el-menu-item>

        <QuicklyCreateMicrofrontends v-model="dialogVisible"/>

      </div>
      <template v-for="group in navBar.top">
        <div :key="group.key" class="nav-group" v-if="group.items.length">
          <h4 v-if="group.name">{{ group.name }}</h4>
          <el-menu-item v-for="mfe in group.items" :key="mfe.route.path" :route="'/' + mfe.route.path"
                        :index="'/' + mfe.route.path">
            <el-icon>
              <component v-if="mfe.route.iconName" :is="'icon-' + mfe.route.iconName"/>
              <font-awesome-icon v-else :icon="['fas', 'circle-dot']"/>
            </el-icon>
            <span>{{ mfe.name }}</span>
          </el-menu-item>
        </div>
      </template>
      <el-menu-item v-if="isPrivilegedUser" route="/admin-dashboard" index="/admin-dashboard" :data-title="$t('Admin Dashboard')">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'chart-column']" />
        </el-icon>
        <span>{{ $t('Admin Dashboard') }}</span>
      </el-menu-item>

      <el-menu-item v-if="isAdmin" :route="{ name: 'log' }" index="/admin/log" :data-title="$t('Logs')">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'clipboard-list']" />
        </el-icon>
        <span>{{ $t('Logs') }}</span>
      </el-menu-item>

      <div class="nav-group" v-if="isManagingEnabled">
        <h4>{{ $t('COMPONENTS') }}</h4>

        <el-sub-menu index="3" :data-title="$t('Content Boxes')">
          <template #title>
            <el-icon>
              <icon-box/>
            </el-icon>
            <span>{{ $t('Content Boxes') }}</span>
          </template>
          <el-menu-item :route="{ name: 'blocks' }" index="/admin/blocks" :data-title="$t('Boxes List')">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'list']"/>
            </el-icon>
            <span>{{ $t('Boxes List') }}</span>
          </el-menu-item>
          <el-menu-item :route="{ name: 'createBlock' }" index="/admin/blocks/new" :data-title="$t('Create Content Box')">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'plus']"/>
            </el-icon>
            <span>{{ $t('Create Content Box') }}</span>
          </el-menu-item>
        </el-sub-menu>

      <el-sub-menu index="4" :data-title="$t('Vue Components')">
          <template #title>
            <el-icon>
              <font-awesome-icon icon="fa-brands fa-web-awesome" />
            </el-icon>
            <span>{{ $t('Vue Components') }}</span>
          </template>
          <el-menu-item :route="{ name: 'components' }" index="/admin/components" :data-title="$t('Components List')">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'list']"/>
            </el-icon>
            <span>{{ $t('Components List') }}</span>
          </el-menu-item>
          <el-menu-item :route="{ name: 'createComponent' }" index="/admin/components/new" :data-title="$t('Create Vue Component')">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'plus']"/>
            </el-icon>
            <span>{{ $t('Create Vue Component') }}</span>
          </el-menu-item>
        </el-sub-menu>
      </div>

      <div class="nav-group" v-if="isManagingEnabled">
        <h4>{{ $t('MANAGE') }}</h4>
        <el-menu-item :route="{ name: 'storageList' }" index="/assets" :data-title="$t('Storage & Assets')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'folder-tree']"/>
          </el-icon>
          <span>{{ $t('Storage & Assets') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled" index="/users" :data-title="$t('Users')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'users']"/>
          </el-icon>
          <span>{{ $t('Users') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled && isWorkspacesActive" index="/admin/workspaces" :data-title="$t('Workspaces')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'briefcase']"/>
          </el-icon>
          <span>{{ $t('Workspaces') }}</span>
        </el-menu-item>

        <el-menu-item :route="{ name: 'drafts' }" index="/drafts" :data-title="$t('Drafts')">
          <el-icon>
            <font-awesome-icon :icon="['far', 'file-lines']"/>
          </el-icon>
          <span>{{ $t('Drafts') }}</span>
        </el-menu-item>

        <el-menu-item id="menu-item-blueprints" v-if="isAdmin && isManagingEnabled" :route="{ name: 'blueprints' }" index="/no-code/blueprints" :data-title="$t('Blueprints')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'database']"/>
          </el-icon>
          <span>{{ $t('Blueprints') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled" :route="{ name: 'configurations' }" index="/configurations" :data-title="$t('Configurations')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'gear']"/>
          </el-icon>
          <span>{{ $t('Configurations') }}</span>
        </el-menu-item>
      </div>

      <div class="nav-group" v-if="isAdmin && isManagingEnabled">
        <h4>{{ $t('PLUGINS') }}</h4>
        <el-menu-item :route="{ name: 'plugins' }" index="/plugins" :data-title="$t('Plugins List')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'plug-circle-bolt']"/>
          </el-icon>
          <span>{{ $t('Plugins List') }}</span>
        </el-menu-item>
        <el-menu-item :route="{ name: 'integrations' }" index="/integrations" :data-title="$t('Integrations')">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'arrows-turn-to-dots']" />
          </el-icon>
          <span>{{ $t('Integrations') }}</span>
        </el-menu-item>
      </div>

      <template v-for="group in navBar.bottom">
        <div :key="group.key" class="nav-group" v-if="group.items.length">
          <h4 v-if="group.name">{{ group.name }}</h4>
          <el-menu-item v-for="mfe in group.items" :key="mfe.route.path" :route="'/' + mfe.route.path"
                        :index="'/' + mfe.route.path">
            <el-icon>
              <component v-if="mfe.route.iconName" :is="'icon-' + mfe.route.iconName"/>
              <font-awesome-icon v-else :icon="['fas', 'circle-dot']"/>
            </el-icon>
            <span>{{ mfe.name }}</span>
          </el-menu-item>
        </div>
      </template>
    </el-menu>
  </nav>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { isAdmin, isEditingEnabled, isManagingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';

import { ref, onMounted, toRef } from 'vue';

const { navBar, hasPages } = storeToRefs(usePluginsMicroFrontends());
const { appConfig } = useAppConfiguration();
import QuicklyCreateMicrofrontends from './navigation/QuicklyCreateMicrofrontends.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

// Visibility state of the modal window
const dialogVisible = ref(false);
const isCollapsed = ref(false);
const isWorkspacesActive = toRef(useWsConfiguration(), 'isActive');


// Check if the user has a preference for collapsed state in localStorage
onMounted(() => {
  const savedState = localStorage.getItem('qelos-nav-collapsed');
  if (savedState) {
    isCollapsed.value = savedState === 'true';
  }  
});

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('qelos-nav-collapsed', isCollapsed.value.toString());
  
  // Force a small delay to ensure the DOM updates properly
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 300);
};

const openDrawer = () => {
  dialogVisible.value = true;
};

defineProps({ opened: Boolean })
const emit = defineEmits(['close'])

const close = () => emit('close')

</script>
<style scoped lang="scss">
nav {
  display: flex;
  flex-direction: column;
  background-color: var(--nav-bg-color);
  transition: width .3s ease, min-width .3s ease;
  min-width: var(--nav-width);
  overflow-y: auto;
  position: relative;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  
  &.collapsed {
    width: var(--nav-width);
    
    .home-logo {
      .logo-image {
        display: none;
      }
      .small-logo-image {
        display: block;
      }
    }
    
    .nav-group h4 {
      opacity: 0;
      height: 0;
      margin: 0;
      overflow: hidden;
    }
    
    // Add tooltip for menu items in collapsed mode
    .el-menu-item, .el-sub-menu__title {
      &:hover {
        &::after {
          content: attr(data-title);
          position: absolute;
          inset-inline-start: 64px;
          inset-block-start: 50%;
          transform: translateY(-50%);
          padding: 8px 12px;
          background: var(--nav-bg-color);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
          border-radius: 4px;
          white-space: nowrap;
          color: var(--negative-color);
          font-size: 14px;
          z-index: 10;
          animation: fadeIn 0.2s ease-in-out;
        }
      }
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-10px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }
}

nav .el-menu,
nav {
  --el-menu-text-color: var(--secondary-color);
  --el-menu-hover-bg-color: var(--main-color);
  --el-menu-bg-color: var(--nav-bg-color);
  --el-menu-active-color: var(--third-color);
  border: 0;
  scrollbar-color: var(--el-menu-hover-bg-color) var(--nav-bg-color);
  overflow: hidden;
  scrollbar-width: thin;

  &:hover {
    overflow: auto;
  }
  
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--nav-bg-color);
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--el-menu-hover-bg-color);
    border-radius: 20px;
  }
}

// Properly handle Element Plus menu collapse
.el-menu-vertical:not(.el-menu--collapse) {
  width: 100%;
  min-width: 200px;
}

.el-menu--collapse {
  width: 64px !important;
  
  .el-sub-menu__title span {
    display: none;
  }
  
  .el-sub-menu__title .el-sub-menu__icon-arrow {
    display: none;
  }
  
  .el-menu-item span {
    display: none;
  }
  
  .el-menu-item, .el-sub-menu__title {
    padding: 0 !important;
    text-align: center;
    display: flex;
    justify-content: center;
    
    .el-icon {
      margin: 0 !important;
    }
  }
}

// Fix for submenu popup positioning in collapsed mode
.el-popper {
  &.is-pure {
    .el-popper__arrow {
      inset-inline-start: -6px !important;
    }
  }
  
  .el-menu--popup {
    padding: 5px;
    min-width: 180px;
    background-color: var(--nav-bg-color);
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    
    .el-menu-item {
      border-radius: 4px;
      margin: 2px;
      height: 40px;
      line-height: 40px;
      display: flex;
      align-items: center;
      
      .el-icon {
        margin-right: 8px;
      }
    }
  }
}

.el-menu-item:hover {
  --el-menu-text-color: var(--negative-color);
  --el-menu-hover-bg-color: var(--main-color);
  --el-menu-bg-color: var(--nav-bg-color);
  border: 0;
}

.el-menu-item.is-active:hover {
  color: var(--negative-color);
}

.el-menu-item {
  padding: 0 20px;
  margin: 5px;
  border-radius: 5px;
  line-height: 50px;
  height: 50px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  
  &:hover {
    transform: translateX(3px);
  }
  
  &.is-active {
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      inset-inline-start: 0;
      top: 0;
      height: 100%;
      width: 3px;
      background-color: var(--el-menu-active-color);
      border-radius: 0 2px 2px 0;
    }
  }
  
  .el-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  
  span {
    flex: 1;
  }
}

.el-sub-menu {
  margin: 5px;
  transition: all 0.3s ease;

  ::v-deep(.el-sub-menu__title) {
    padding: 0 20px;
    border-radius: 5px;
    line-height: 50px;
    height: 50px;
    --el-menu-text-color: var(--secondary-color);
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    align-items: center;
    
    &:hover {
      color: var(--negative-color);
      transform: translateX(3px);
    }
    
    .el-icon {
      margin-right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }
    
    span {
      flex: 1;
    }
    
    .el-sub-menu__icon-arrow {
      position: absolute;
      inset-inline-end: 20px;
      inset-block-start: 25%;
      transform: translateY(-50%);
      font-size: 12px;
      margin-block-start: 0;
    }
  }

  ::v-deep(.el-menu) {
    background-color: var(--nav-bg-color);
    --el-menu-text-color: var(--secondary-color);
    padding-inline-start: 5px;
    border-inline-start: 1px dashed rgba(255, 255, 255, 0.1);
    margin-inline-start: 10px;
  }
  
  &.is-active {
    ::v-deep(.el-sub-menu__title) {
      &::before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        inset-block-start: 0;
        height: 100%;
        width: 3px;
        background-color: var(--el-menu-active-color);
        border-radius: 0 2px 2px 0;
      }
    }
  }
}

a:hover {
  border: none;
}

.mobile-mask {
  display: none;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  background-color: var(--nav-bg-color);
  position: sticky;
  inset-block-start: 0;
  z-index: 2;
  transition: all 0.3s ease;
  width: 100%;
  height: 70px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.home-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  flex: 1;
  transition: all 0.3s ease;
  overflow: hidden;
  
  .logo-image {
    max-width: 80%;
    max-height: 100%;
    transition: opacity 0.3s ease;
    margin-bottom: 0;
  }
  
  .small-logo-image {
    max-width: 40px;
    max-height: 40px;
    display: none;
  }
}

.collapse-toggle {
  background: transparent;
  border: none;
  color: var(--secondary-color);
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--negative-color);
  }
}

@media (max-width: 600px) {
  nav {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    min-width: 100%;
    height: 0; /* Start with 0 height when closed */
    opacity: 0; /* Start with 0 opacity when closed */
    overflow: hidden;
    transition: all 0.3s ease-in-out;
    z-index: 100;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    margin: 0;
    transform: translateY(100%); /* Start off-screen */
    pointer-events: none; /* Prevent interaction when hidden */
    
    .el-menu {
      display: none;
    }

    &.show {
      position: fixed;
      inset-block-start: 0;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100vh;
      opacity: 1;
      margin: 0;
      border-radius: 0;
      overflow: auto;
      transform: translateY(0); /* Slide in from bottom */
      pointer-events: auto; /* Re-enable interactions */
      display: flex;
      flex-direction: column;
      padding-bottom: env(safe-area-inset-bottom, 80px); /* Add safe area padding for iPhone */
      
      .el-menu {
        display: block;
        padding-bottom: 100px;
        margin-top: 10px; /* Add some space at the top */
        animation: fadeIn 0.3s ease-in-out; /* Animate menu items */
      }

      .mobile-mask {
        display: block;
        position: fixed;
        inset-block-start: 0;
        inset-inline-start: 0;
        inset-inline-end: 0;
        inset-block-end: 0;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: -1;
      }
    }
  }

  .home-logo {
    background: transparent;

    img {
      display: inline;
    }
  }
  
  .collapse-toggle {
    display: none;
  }
}

@media (min-width: 1200px) {
  nav {
    margin: var(--spacing);
    border-radius: var(--border-radius);
  }

  nav .home-logo {
    margin: 0 auto;
    width: var(--nav-width);
  }

  nav .home-logo img {
    display: inline-block;
  }
}

.nav-group {
  position: relative;
  padding: 5px 0;
  transition: all 0.3s ease;
  
  &:not(:last-child)::after {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
    margin: 8px 15px;
  }
  
  h4 {
    color: var(--negative-color);
    font-size: var(--base-font-size, 16px);
    font-weight: 500;
    margin: 15px 10px 10px;
    transition: all 0.3s ease;
    opacity: 0.8;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-size: 0.8rem;
    
    &:before {
      content: '';
      display: inline-block;
      vertical-align: middle;
      width: 15px;
      height: 1px;
      background-color: var(--negative-color);
      margin-inline-end: 5px;
      opacity: 0.6;
    }
  }
}

.bottom {
  margin-top: auto;
}
</style>
