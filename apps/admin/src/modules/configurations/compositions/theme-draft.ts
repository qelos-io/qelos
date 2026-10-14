import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAppConfiguration, resetConfiguration } from '../store/app-configuration';
import configurationsService from '@/services/apis/configurations-service';
import { buildThemeCss, isColorDark, resolveThemeSettings, themeVariables } from '../../core/services/theme';
import {
  applyPresetToDraft,
  changedAreas,
  configWithDraft,
  draftFromConfig,
  fontsUrlFor,
  type ThemeDraft,
} from '../services/appearance';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * The Appearance page edits a copy of the saved settings. Nothing is saved until publish(); the preview is built
 * from the same theme function the whole app uses.
 */
export function useThemeDraft() {
  const { appConfig } = useAppConfiguration();

  const saved = computed(() => draftFromConfig(appConfig.value));
  const draft = ref<ThemeDraft>(clone(saved.value));

  const areas = computed(() => changedAreas(saved.value, draft.value));
  const dirty = computed(() => areas.value.length > 0);

  // the theme as it would be after publishing
  const previewCss = computed(() => buildThemeCss(resolveThemeSettings(configWithDraft(appConfig.value, draft.value))));
  const previewVariables = computed(() => ({
    ...themeVariables(previewCss.value),
    // the app maps these Element Plus tokens in its base stylesheet; the preview needs them in scope too
    '--el-color-primary': 'var(--main-color)',
    '--el-text-color-primary': 'var(--main-color)',
    '--el-text-color-regular': 'var(--text-color)',
  }));
  const isDark = computed(() => !!draft.value.colorsPalette.bgColor && isColorDark(draft.value.colorsPalette.bgColor));

  function discard() {
    draft.value = clone(saved.value);
  }

  function applyPreset(palette: Record<string, any>) {
    draft.value = applyPresetToDraft(draft.value, palette);
  }

  /** Picks a font and keeps the Google Fonts stylesheet in step with the fonts in use. */
  function setFont(kind: 'fontFamily' | 'headingsFontFamily', stack: string) {
    draft.value[kind] = stack;
    draft.value.colorsPalette = {
      ...draft.value.colorsPalette,
      fontsUrl: fontsUrlFor([draft.value.fontFamily, draft.value.headingsFontFamily], draft.value.colorsPalette.fontsUrl),
    };
  }

  const publishing = ref(false);
  async function publish() {
    publishing.value = true;
    try {
      await configurationsService.update('app-configuration', { metadata: configWithDraft(appConfig.value, draft.value) });
      resetConfiguration();
    } finally {
      publishing.value = false;
    }
  }

  // when the saved settings change underneath (after publishing, or from elsewhere) and there are no edits, follow them
  watch(saved, (next, previous) => {
    if (JSON.stringify(draft.value) === JSON.stringify(previous) || !dirty.value) draft.value = clone(next);
  });

  // the preview needs the web fonts of the draft; they are loaded for the lifetime of the page
  const FONT_LINK_ID = 'appearance-preview-fonts';
  watch(
    () => draft.value.colorsPalette.fontsUrl,
    (url) => {
      let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
      if (typeof url === 'string' && url.startsWith('https://fonts.googleapis.com/')) {
        if (!link) {
          link = document.createElement('link');
          link.id = FONT_LINK_ID;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        if (link.href !== url) link.href = url;
      } else {
        link?.remove();
      }
    },
    { immediate: true },
  );
  onBeforeUnmount(() => document.getElementById(FONT_LINK_ID)?.remove());

  return { draft, saved, areas, dirty, isDark, previewVariables, publishing, discard, applyPreset, setFont, publish };
}
