import { defineStore } from 'pinia';
import { reactive, readonly, ref } from 'vue';
import { ColorName } from '@/modules/configurations/types/colors-palette';
import { softResetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/apis/configurations-service';

export const useLiveEditStore = defineStore('live-edit', () => {
  const { appConfig } = useAppConfiguration();
  const isOpen = ref(false);
  const editing = reactive({
    inputType: null,
    key: null,
    keyName: null,
    currentValue: null
  })

  function openPaletteColorLiveEdit(key: string) {
    editing.inputType = 'color';
    editing.key = `colorsPalette.${key}`;
    editing.keyName = ColorName[key];
    editing.currentValue = appConfig.value.colorsPalette[key];
    isOpen.value = true;
  }

  async function submitEdit(newValue: unknown) {
    if (editing.key.startsWith('colorsPalette.')) {
      await changePalette({
        ...appConfig.value.colorsPalette,
        [editing.key.split('.')[1]]: newValue,
      })
      isOpen.value = false;
    }
  }

  async function changePalette(colorsPalette) {
    await configurationsService.update('app-configuration', {
      metadata: {
        ...appConfig.value,
        colorsPalette
      }
    })
    await softResetConfiguration();
  }

  /**
   * Applies a whole theme. App.vue lets top-level settings (fonts, radius, spacing...) override
   * the palette's own, so they must be written together or the previous theme leaks through.
   */
  async function applyTheme(palette) {
    const current = appConfig.value
    await configurationsService.update('app-configuration', {
      metadata: {
        ...current,
        colorsPalette: palette,
        borderRadius: palette.borderRadius ?? current.borderRadius ?? 0,
        buttonRadius: palette.buttonRadius ?? palette.borderRadius ?? current.borderRadius ?? 4,
        baseFontSize: palette.baseFontSize ?? current.baseFontSize ?? 16,
        fontFamily: palette.fontFamily ?? current.fontFamily,
        headingsFontFamily: palette.headingsFontFamily ?? palette.fontFamily ?? current.fontFamily,
        spacing: palette.spacing ?? current.spacing ?? 'normal',
        shadowStyle: palette.shadowStyle ?? current.shadowStyle ?? 'light',
        animationSpeed: palette.animationSpeed ?? current.animationSpeed ?? 300,
      }
    })
    await softResetConfiguration();
  }

  function cancelEdit() {
    isOpen.value = false;
  }

  return {
    isOpen,
    editing: readonly(editing),
    openPaletteColorLiveEdit,
    submitEdit,
    changePalette,
    applyTheme,
    cancelEdit
  }
})