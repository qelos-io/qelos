import { ref, computed } from 'vue';
import { 
  drawerState, 
  setDrawerState, 
  toggleDrawer, 
  currentDrawerWidth,
  isDrawerOpen 
} from '../store/builderTheme';

export function useNavigationDrawer() {
  const isSearchVisible = ref(false);
  const searchQuery = ref('');
  
  // Computed properties
  const isExpanded = computed(() => drawerState.value === 'expanded');
  const isCollapsed = computed(() => drawerState.value === 'collapsed');
  const isHidden = computed(() => drawerState.value === 'hidden');
  
  // Drawer actions
  const expandDrawer = () => setDrawerState('expanded');
  const collapseDrawer = () => setDrawerState('collapsed');
  const hideDrawer = () => setDrawerState('hidden');
  
  // Search functionality
  const showSearch = () => {
    isSearchVisible.value = true;
    // Focus search input after DOM update
    setTimeout(() => {
      const searchInput = document.querySelector('#builder-nav-search input') as HTMLInputElement;
      searchInput?.focus();
    }, 100);
  };
  
  const hideSearch = () => {
    isSearchVisible.value = false;
    searchQuery.value = '';
  };
  
  // Keyboard shortcuts
  const handleKeyboardShortcut = (event: KeyboardEvent) => {
    // Cmd/Ctrl + K for search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (isExpanded.value) {
        showSearch();
      } else {
        expandDrawer();
        setTimeout(showSearch, 300);
      }
    }
    
    // Cmd/Ctrl + B to toggle drawer
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      toggleDrawer();
    }
    
    // Escape to hide search
    if (event.key === 'Escape' && isSearchVisible.value) {
      hideSearch();
    }
  };
  
  return {
    // State
    drawerState,
    isDrawerOpen,
    isExpanded,
    isCollapsed,
    isHidden,
    currentDrawerWidth,
    isSearchVisible,
    searchQuery,
    
    // Actions
    expandDrawer,
    collapseDrawer,
    hideDrawer,
    toggleDrawer,
    showSearch,
    hideSearch,
    handleKeyboardShortcut
  };
}
