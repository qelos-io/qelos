import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { isAdmin, isEditingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { buildNavSections, flattenNav, isActivePath } from '../services/navigation-model';

/** The navigation model for the signed-in user, shared by the sidebar, tab bar, header and command palette. */
export function useNavSections() {
  const { t } = useI18n();
  const { navBar, hasPages } = storeToRefs(usePluginsMicroFrontends());
  const wsConfig = useWsConfiguration();

  return computed(() =>
    buildNavSections({
      isAdmin: isAdmin.value,
      isPrivileged: isPrivilegedUser.value,
      isWorkspacesActive: !!wsConfig.isActive,
      canCreatePage: isEditingEnabled.value || (isAdmin.value && !hasPages.value),
      top: navBar.value.top as any,
      bottom: navBar.value.bottom as any,
      t,
    }),
  );
}

/** The nav entry (and its section) the current path belongs to; the most specific match wins. */
export function findCurrent(sections: ReturnType<typeof buildNavSections>, path: string) {
  let best: { label: string; section: string; length: number } | null = null;
  for (const section of sections) {
    for (const item of flattenNav([section])) {
      if (item.to && isActivePath(item.to, path) && (!best || item.to.length > best.length)) {
        best = { label: item.label, section: section.label, length: item.to.length };
      }
    }
  }
  return best;
}
