import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import componentsService from '@/services/apis/components-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { INoCodeComponent } from '@qelos/global-types';

export const useComponentsList = defineStore('components-list', function useComponentsList() {
  const { loading, result, retry } = useDispatcher<INoCodeComponent[]>(() => componentsService.getAll());

  const { submit } = useSubmitting(
    ({ _id }) =>
      componentsService.remove(_id).then(() => {
        result.value = result.value.filter((component) => component._id !== _id);
      }),
    {
      success: 'Component removed successfully',
      error: 'Failed to remove component'
    }
  )

  return {
    loading,
    components: result,
    removeComponent: submit,
    retry
  }
})
