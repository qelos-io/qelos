import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import blueprintsService from '@/services/blueprints-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { IBlueprint } from '@qelos/global-types';

export const useBlueprintsStore = defineStore('blueprints', () => {
  const { result: blueprints, retry, loading, loaded } = useDispatcher<IBlueprint[]>(() => {
    return blueprintsService.getAll()
  }, []);

  const selectedItemIdentifier = ref(null)
  const selectedItem = computed<IBlueprint | undefined>(() => selectedItemIdentifier.value && blueprints.value?.find((item) => item.identifier === selectedItemIdentifier.value))

  const { submit: create, submitting: submittingNewItem } = useSubmitting(blueprintsService.create, {
    success: 'Blueprint created successfully',
    error: 'Failed to create blueprint'
  })

  const { submit: update, submitting: submittingUpdateItem } = useSubmitting(blueprintsService.update, {
    success: 'Blueprint updated successfully',
    error: 'Failed to update blueprint'
  })

  const { submit: remove, submitting: submittingDeletedItem } = useSubmitting(blueprintsService.remove, {
    success: 'Blueprint removed successfully',
    error: 'Failed to removed blueprint'
  })

  return {
    blueprints,
    retry,
    loading,
    loaded,
    create,
    update,
    remove,
    submittingNewItem,
    submittingUpdateItem,
    submittingDeletedItem,
    selectedItem,
    selectItem(identifier: string) {
      selectedItemIdentifier.value = identifier;
    }
  }
})