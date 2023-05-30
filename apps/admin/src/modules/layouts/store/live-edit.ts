import {defineStore} from 'pinia';
import {reactive, readonly, ref} from 'vue';
import {ColorName} from '@/modules/configurations/types/colors-palette';
import {resetConfiguration, useAppConfiguration} from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';

export const useLiveEditStore = defineStore('live-edit', () => {
  const {appConfig} = useAppConfiguration();
  const isOpen = ref(false);
  const editing = reactive({
    inputType: null,
    key: null,
    keyName: null,
    currentValue: null
  })

  function openLiveEdit(key: string) {

  }

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
    await resetConfiguration();
  }

  function cancelEdit() {
    isOpen.value = false;
  }

  return {
    isOpen,
    editing: readonly(editing),
    openLiveEdit,
    openPaletteColorLiveEdit,
    submitEdit,
    cancelEdit
  }
})