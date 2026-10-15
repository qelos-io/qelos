import { watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { legacyEditorLocation } from '../services/integration-presentation';

/** Sends old dialog-style links (?mode=edit&id=…, ?mode=create) to the editor page. */
export function useLegacyEditorRedirect(enabled?: Ref<boolean>) {
  const route = useRoute();
  const router = useRouter();
  watch(
    () => route.query,
    (query) => {
      if (enabled && !enabled.value) return;
      const location = legacyEditorLocation(query as any);
      if (location) router.replace(location);
    },
    { immediate: true },
  );
}
