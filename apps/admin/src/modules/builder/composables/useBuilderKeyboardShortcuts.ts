import { onMounted, onUnmounted } from 'vue';
import { useNavigationDrawer } from './useNavigationDrawer';
import { setBuilderMode, builderMode } from '../store/builderTheme';
import { isManagingEnabled, isLoadingDataAsUser } from '@/modules/core/store/auth';

export function useBuilderKeyboardShortcuts() {
  const { handleKeyboardShortcut } = useNavigationDrawer();
  
  const handleGlobalKeyboardShortcut = (event: KeyboardEvent) => {
    // Only handle shortcuts when not in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }
    
    // Handle navigation shortcuts
    handleKeyboardShortcut(event);
    
    // Cmd/Ctrl + E to toggle edit mode
    if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
      event.preventDefault();
      isManagingEnabled.value = !isManagingEnabled.value;
    }
    
    // Cmd/Ctrl + Shift + A to toggle admin/data scope
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      isLoadingDataAsUser.value = !isLoadingDataAsUser.value;
    }
    
    // Number keys for quick mode switching
    if (event.altKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          setBuilderMode('view');
          break;
        case '2':
          event.preventDefault();
          setBuilderMode('edit');
          break;
        case '3':
          event.preventDefault();
          setBuilderMode('full-admin');
          break;
      }
    }
  };
  
  onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeyboardShortcut);
  });
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeyboardShortcut);
  });
  
  return {
    shortcuts: {
      search: '⌘K',
      toggleDrawer: '⌘B',
      toggleEdit: '⌘E',
      toggleAdminScope: '⌘⇧A',
      modeView: 'Alt+1',
      modeEdit: 'Alt+2',
      modeAdmin: 'Alt+3'
    }
  };
}
