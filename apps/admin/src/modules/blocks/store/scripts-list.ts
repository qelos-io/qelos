import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import scriptsService from '@/services/apis/scripts-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import type { IScript } from '@qelos/sdk/src/administrator/scripts';

export const useScriptsList = defineStore('scripts-list', function useScriptsList() {
  const { loading, result, retry } = useDispatcher<IScript[]>(() => scriptsService.getAll());

  const { submit } = useSubmitting(
    ({ _id }) =>
      scriptsService.remove(_id).then(() => {
        result.value = result.value.filter((script) => script._id !== _id);
      }),
    {
      success: 'Script removed successfully',
      error: 'Failed to remove script',
    }
  );

  return { loading, scripts: result, removeScript: submit, retry };
});
