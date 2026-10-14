import { computed, ref } from 'vue';

// One source of truth for the shell's breakpoints, so the sidebar, header and tab bar always agree.
export const COMPACT_MAX = 639;
export const TABLET_MAX = 1023;

const width = ref(typeof window === 'undefined' ? 1280 : window.innerWidth);
let listening = false;

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('resize', () => (width.value = window.innerWidth), { passive: true });
}

export function useViewport() {
  listen();
  return {
    width,
    /** phones: bottom tab bar + sheet */
    isCompact: computed(() => width.value <= COMPACT_MAX),
    /** tablets: icon rail + drawer */
    isTablet: computed(() => width.value > COMPACT_MAX && width.value <= TABLET_MAX),
    isDesktop: computed(() => width.value > TABLET_MAX),
  };
}
