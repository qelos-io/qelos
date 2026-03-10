import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import plansService from '@/services/apis/plans-service';
import { IPlan } from '@qelos/global-types';
import { ref } from 'vue';

export const usePlansStore = defineStore('plans', () => {
  const {
    result,
    loading,
    loaded,
    promise,
    error,
    retry,
  } = useDispatcher<IPlan[]>(() => plansService.getAll(), []);

  const saving = ref(false);

  async function create(plan: Omit<IPlan, '_id' | 'tenant' | 'created'>) {
    saving.value = true;
    try {
      const created = await plansService.create(plan);
      await retry();
      return created;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: string, plan: Partial<IPlan>) {
    saving.value = true;
    try {
      const updated = await plansService.update(id, plan);
      await retry();
      return updated;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    await plansService.remove(id);
    await retry();
  }

  return {
    plans: result,
    loading,
    loaded,
    promise,
    error,
    saving,
    retry,
    create,
    update,
    remove,
  };
});
