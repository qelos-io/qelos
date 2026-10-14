import { ref } from 'vue';

// Shared shell state: the command palette and the "create page" drawer can be opened from the header,
// the navigation and the keyboard, whichever navigation component is rendered.
export const isPaletteOpen = ref(false);
export const isCreatePageOpen = ref(false);

export const openPalette = () => (isPaletteOpen.value = true);
export const togglePalette = () => (isPaletteOpen.value = !isPaletteOpen.value);
export const openCreatePage = () => (isCreatePageOpen.value = true);
