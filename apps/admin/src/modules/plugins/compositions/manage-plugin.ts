import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import pluginsService from '@/services/apis/plugins-service';
import { IPlugin } from '@/services/types/plugin';
import { usePluginsList } from '../store/plugins-list';
import { reactive } from 'vue';

export function useEditPlugin(pluginId?: string) {
  const {
    loading,
    result: plugin,
    retry: reload
  } = useDispatcher<IPlugin>(() => pluginsService.getOne(pluginId), null, !pluginId);
  const { removePlugin, retry } = usePluginsList();

  const { submit: updatePlugin, submitting } = useSubmitting(
    (changes: Partial<IPlugin>) =>
      pluginsService.update(pluginId, changes).then(retry),
    {
      success: 'Plugin updated successfully',
      error: (err: Error & any) => {
        return err?.response?.data?.message || 'Failed to update plugin'
      }
    }
  )

  return {
    loading,
    submitting,
    plugin,
    load: async (newId?: string) => {
      if (newId) {
        pluginId = newId
      }
      await reload()
      return plugin.value;
    },
    removePlugin: () => removePlugin(plugin.value),
    updatePlugin
  }
}

export function useCreatePlugin() {
  const plugin = reactive<Partial<IPlugin>>({
    manifestUrl: '',
  })
  const { submit: savePlugin, submitting } = useSubmitting(
    (data: Partial<IPlugin>) =>
      pluginsService.create<Partial<IPlugin>>(data),
    {
      success: 'Plugin created successfully',
      error: (err: any) => err?.response?.data?.message || 'Failed to create plugin'
    }
  )

  return {
    submitting,
    plugin,
    savePlugin
  }
}
