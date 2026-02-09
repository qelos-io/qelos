import { computed, ref, watch } from 'vue';
import { isAdmin } from '@/modules/core/store/auth';

export type BuilderMode = 'view' | 'edit' | 'full-admin';
export type DrawerState = 'expanded' | 'collapsed' | 'hidden';

const BUILDER_DRAWER_STATE_KEY = 'builderDrawerState';
const BUILDER_MODE_KEY = 'builderMode';

// Reactive state
export const isBuilderThemeActive = ref<boolean>(false);
export const drawerState = ref<DrawerState>('expanded');
export const builderMode = ref<BuilderMode>('view');
export const isDrawerOpen = ref<boolean>(true);

// Computed properties
export const shouldShowBuilderTheme = computed(() => {
  // Will be updated to check for desktop and admin
  return isAdmin.value && isBuilderThemeActive.value;
});

export const currentDrawerWidth = computed(() => {
  switch (drawerState.value) {
    case 'expanded': return '280px';
    case 'collapsed': return '64px';
    case 'hidden': return '0px';
    default: return '100%';
  }
});

// Initialize builder theme based on conditions
export function initializeBuilderTheme(isMobile: boolean) {
  isBuilderThemeActive.value = isAdmin.value;
  
  // Load saved preferences
  const savedDrawerState = localStorage.getItem(BUILDER_DRAWER_STATE_KEY) as DrawerState;
  const savedMode = localStorage.getItem(BUILDER_MODE_KEY) as BuilderMode;
  
  if (savedDrawerState) {
    drawerState.value = savedDrawerState;
  }
  
  if (savedMode) {
    builderMode.value = savedMode;
  }
  
  // Update drawer open state based on drawer state
  isDrawerOpen.value = drawerState.value !== 'hidden';
}

// Watch for admin status changes and update builder theme
watch(isAdmin, (isAdminValue) => {
  // Re-initialize when admin status changes
  isBuilderThemeActive.value = isAdminValue;
});

// Mode management
export function setBuilderMode(mode: BuilderMode) {
  builderMode.value = mode;
  localStorage.setItem(BUILDER_MODE_KEY, mode);
}

// Drawer management
export function setDrawerState(state: DrawerState) {
  drawerState.value = state;
  localStorage.setItem(BUILDER_DRAWER_STATE_KEY, state);
  isDrawerOpen.value = state !== 'hidden';
}

export function toggleDrawer() {
  if (drawerState.value === 'expanded') {
    setDrawerState('collapsed');
  } else if (drawerState.value === 'collapsed') {
    setDrawerState('hidden');
  } else {
    setDrawerState('expanded');
  }
}

// Watch for changes and update DOM
watch(drawerState, (newState) => {
  document.documentElement.setAttribute('data-builder-drawer', newState);
}, { immediate: true });

watch(builderMode, (newMode) => {
  document.documentElement.setAttribute('data-builder-mode', newMode);
}, { immediate: true });

watch(isBuilderThemeActive, (isActive) => {
  if (isActive) {
    document.documentElement.setAttribute('data-builder-theme', 'true');
  } else {
    document.documentElement.removeAttribute('data-builder-theme');
  }
}, { immediate: true });
