<template>
  <div 
    class="builder-navigation-drawer"
    :class="{
      'is-expanded': isExpanded,
      'is-collapsed': isCollapsed,
      'is-hidden': isHidden
    }"
  >
    <!-- Drawer backdrop for mobile/tablet -->
    <Transition name="drawer-backdrop">
      <div 
        v-if="isDrawerOpen && !isExpanded"
        class="drawer-backdrop"
        @click="hideDrawer"
      />
    </Transition>
    
    <!-- Drawer content -->
    <div class="drawer-content" :style="{ width: currentDrawerWidth }">
      <!-- Header -->
      <div class="drawer-header">
        <div v-if="isExpanded" class="header-content">
          <h2 class="drawer-title">Builder Panel</h2>
        </div>
        <el-button
          class="collapse-btn"
          circle
          size="small"
          @click="toggleDrawer"
        >
          <font-awesome-icon :icon="isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'" />
        </el-button>
      </div>
      
      <!-- Search -->
      <Transition name="search">
        <div v-if="isSearchVisible" class="drawer-search">
          <el-input
            id="builder-nav-search"
            v-model="searchQuery"
            placeholder="Quick search..."
            clearable
            @clear="hideSearch"
            @keydown.esc="hideSearch"
          >
            <template #prefix>
              <font-awesome-icon icon="fas fa-search" />
            </template>
          </el-input>
        </div>
      </Transition>
      
      <!-- Navigation sections -->
      <div class="drawer-nav">
        <!-- Admin navigation -->
        <BuilderNavSection
          title="Admin Tools"
          icon="fas fa-tools"
          :collapsed-items="collapsedAdminItems"
        >
          <BuilderNavItem
            v-for="item in adminNavItems"
            :key="item.path"
            :icon="item.icon"
            :label="item.label"
            :to="item.path"
            :active="$route.path === item.path"
          />
        </BuilderNavSection>
        
        <!-- MFE navigation -->
        <BuilderNavSection
          v-if="mfeNavItems.length"
          title="Integrations"
          icon="fas fa-link"
          :collapsed-items="collapsedMfeItems"
        >
          <BuilderNavItem
            v-for="item in mfeNavItems"
            :key="item.key"
            :icon="item.icon"
            :label="item.label"
            :to="item.route"
            :active="$route.path === item.route"
          />
        </BuilderNavSection>
      </div>
      
      <!-- Footer -->
      <div v-if="isExpanded" class="drawer-footer">
        <div class="shortcuts-hint">
          <el-tooltip content="Press ⌘K to search" placement="top">
            <span class="shortcut">⌘K</span>
          </el-tooltip>
          <el-tooltip content="Press ⌘B to toggle" placement="top">
            <span class="shortcut">⌘B</span>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Floating toggle button when drawer is hidden -->
  <Transition name="builder-toggle">
    <div
      v-if="isHidden && shouldShowBuilderTheme"
      class="builder-drawer-toggle"
      @click="toggleDrawer"
      :title="'Show Builder Panel (⌘B)'"
    >
      <font-awesome-icon icon="fas fa-hammer" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue';
import { useNavigationDrawer } from '../composables/useNavigationDrawer';
import { useBuilderTheme } from '../composables/useBuilderTheme';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { isAdmin } from '@/modules/core/store/auth';
import BuilderNavSection from './BuilderNavSection.vue';
import BuilderNavItem from './BuilderNavItem.vue';
import { storeToRefs } from 'pinia';

const { microFrontends } = storeToRefs(usePluginsMicroFrontends());
const { shouldShowBuilderTheme } = useBuilderTheme(false);

// Provide drawer collapsed state to child components
const { isCollapsed, isHidden } = useNavigationDrawer();
provide('isDrawerCollapsed', isCollapsed);

const {
  isExpanded,
  isDrawerOpen,
  currentDrawerWidth,
  isSearchVisible,
  searchQuery,
  toggleDrawer,
  hideDrawer,
  hideSearch
} = useNavigationDrawer();

// Admin navigation items
const adminNavItems = computed(() => [
  { path: '/admin/components', label: 'Components', icon: 'fas fa-th' },
  { path: '/admin/blocks', label: 'Content Boxes', icon: 'fas fa-box' },
  { path: '/users', label: 'Users', icon: 'fas fa-user' },
  { path: '/admin/workspaces', label: 'Workspaces', icon: 'fas fa-briefcase' },
  { path: '/no-code/blueprints', label: 'Blueprints', icon: 'fas fa-database' },
  { path: '/configurations', label: 'Configurations', icon: 'fas fa-gear' },
  { path: '/drafts', label: 'Drafts', icon: 'fas fa-file-lines' },
  { path: '/assets', label: 'Storage & Assets', icon: 'fas fa-folder-tree' },
  { path: '/plugins', label: 'Plugins', icon: 'fas fa-plug' },
  { path: '/integrations', label: 'Integrations', icon: 'fas fa-link' }
]);

// MFE navigation items (admin only)
const mfeNavItems = computed(() => {
  if (!isAdmin.value) return [];
  
  const items = [];
  const mfe = microFrontends.value;
  
  // Collect all MFE items with admin roles
  ['top', 'bottom'].forEach(position => {
    mfe.navBar[position].forEach(group => {
      group.items.forEach(item => {
        if (item.roles?.includes('admin')) {
          items.push({
            key: item.key,
            label: item.label || item.key || item.name,
            route: item.route,
            icon: item.icon || 'fas fa-th'
          });
        }
      });
    });
  });
  
  return items;
});

// Collapsed mode items (show only most important)
const collapsedAdminItems = computed(() => 
  adminNavItems.value.filter(item => 
    ['/admin/components', '/admin/blocks', '/users', '/plugins'].includes(item.path)
  )
);

const collapsedMfeItems = computed(() => 
  mfeNavItems.value.slice(0, 3)
);
</script>

<style scoped lang="scss">
.builder-navigation-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 2000;
  pointer-events: none;
  
  // Remove backdrop - no glass effect
  .drawer-backdrop {
    display: none;
  }
  
  .drawer-content {
    position: relative;
    height: 100vh;
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color);
    pointer-events: all;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  &.is-hidden {
    .drawer-content {
      width: 0 !important;
      overflow: hidden;
    }
  }
  
  .drawer-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 64px;
    
    .header-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .drawer-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
      
      .mode-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 500;
        
        .el-icon {
          font-size: 14px;
        }
      }
    }
    
    .collapse-btn {
      flex-shrink: 0;
    }
  }
  
  .drawer-search {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  
  .drawer-nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .drawer-footer {
    padding: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
    
    .shortcuts-hint {
      display: flex;
      gap: 8px;
      justify-content: center;
      
      .shortcut {
        padding: 4px 8px;
        background: var(--el-fill-color-light);
        border-radius: 4px;
        font-size: 11px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        color: var(--el-text-color-secondary);
        cursor: help;
        transition: all 0.2s;
        
        &:hover {
          background: var(--el-fill-color);
          color: var(--el-text-color-primary);
        }
      }
    }
  }
}

// Transitions
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.3s;
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.search-enter-active,
.search-leave-active {
  transition: all 0.3s;
  overflow: hidden;
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Collapsed mode adjustments
.is-collapsed {
  .drawer-header {
    padding: 16px 8px;
    justify-content: center;
    
    .collapse-btn {
      margin: 0;
    }
  }
  
  .drawer-nav {
    padding: 4px;
  }
}

// Floating toggle button
.builder-drawer-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  background: var(--el-color-primary);
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 0 8px 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transition: all 0.3s ease;
  
  &:hover {
    width: 56px;
    background: var(--el-color-primary-dark-2);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

// Toggle button transition
.builder-toggle-enter-active,
.builder-toggle-leave-active {
  transition: all 0.3s ease;
}

.builder-toggle-enter-from,
.builder-toggle-leave-to {
  transform: translateY(-50%) translateX(-100%);
  opacity: 0;
}
</style>
