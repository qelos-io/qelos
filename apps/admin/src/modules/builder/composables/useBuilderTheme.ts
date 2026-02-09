import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { 
  isBuilderThemeActive, 
  initializeBuilderTheme, 
  shouldShowBuilderTheme,
  builderMode,
  setBuilderMode
} from '../store/builderTheme';
import { isAdmin, isManagingEnabled, isLoadingDataAsUser } from '@/modules/core/store/auth';

export function useBuilderTheme(isMobile: boolean) {
  const route = useRoute();

  // Initialize theme
  onMounted(() => {
    initializeBuilderTheme(false);
  });

  // Update builder mode based on existing flags
  watch([isManagingEnabled, isLoadingDataAsUser], ([managing, loadingAsUser]) => {
    if (!isAdmin.value) return;
    
    if (managing && !loadingAsUser) {
      setBuilderMode('full-admin');
    } else if (managing) {
      setBuilderMode('edit');
    } else {
      setBuilderMode('view');
    }
  }, { immediate: true });

  // Computed properties
  const isBuilderPage = computed(() => {
    // Check if current route is an admin/builder route
    return route.path.startsWith('/admin') || 
           route.path.startsWith('/users') ||
           route.path.startsWith('/plugins') ||
           route.path.startsWith('/integrations') ||
           route.path.startsWith('/no-code') ||
           route.path.startsWith('/configurations') ||
           route.path.startsWith('/drafts') ||
           route.path.startsWith('/assets');
  });

  const modeIcon = computed(() => {
    switch (builderMode.value) {
      case 'view': return 'fas fa-eye';
      case 'edit': return 'fas fa-edit';
      case 'full-admin': return 'fas fa-gear';
      default: return 'fas fa-eye';
    }
  });

  const modeColor = computed(() => {
    switch (builderMode.value) {
      case 'view': return '#67c23a';
      case 'edit': return '#e6a23c';
      case 'full-admin': return '#f56c6c';
      default: return '#67c23a';
    }
  });

  return {
    // State
    isBuilderThemeActive,
    shouldShowBuilderTheme,
    builderMode,
    modeIcon,
    modeColor,
    isBuilderPage,
    
    // Actions
    setBuilderMode
  };
}
