import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import couponsService from '@/services/apis/coupons-service';
import { ICoupon } from '@qelos/global-types';
import { ref } from 'vue';

export const useCouponsStore = defineStore('coupons', () => {
  const {
    result,
    loading,
    loaded,
    promise,
    error,
    retry,
  } = useDispatcher<ICoupon[]>(() => couponsService.getAll(), []);

  const saving = ref(false);

  async function create(coupon: Omit<ICoupon, '_id' | 'tenant' | 'created' | 'currentRedemptions'>) {
    saving.value = true;
    try {
      const created = await couponsService.create(coupon);
      await retry();
      return created;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: string, coupon: Partial<ICoupon>) {
    saving.value = true;
    try {
      const updated = await couponsService.update(id, coupon);
      await retry();
      return updated;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    await couponsService.remove(id);
    await retry();
  }

  return {
    coupons: result,
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
