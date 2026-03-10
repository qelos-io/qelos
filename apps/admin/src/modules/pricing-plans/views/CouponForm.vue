<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import couponsService from '@/services/apis/coupons-service';
import { useCouponsStore } from '../store/coupons';
import { usePlansStore } from '../store/plans';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const couponsStore = useCouponsStore();
const plansStore = usePlansStore();
const { plans } = storeToRefs(plansStore);

const isEdit = computed(() => !!route.params.couponId);
const loading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  code: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: 0,
  currency: 'USD',
  maxRedemptions: null as number | null,
  validFrom: null as string | null,
  validUntil: null as string | null,
  applicablePlanIds: [] as string[],
  isActive: true,
});

const rules = reactive<FormRules>({
  code: [{ required: true, message: t('Coupon code is required'), trigger: 'blur' }],
  discountValue: [{ required: true, message: t('Discount value is required'), trigger: 'blur' }],
});

const planOptions = computed(() =>
  (plans.value || []).map(p => ({ label: p.name, value: p._id }))
);

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true;
    try {
      const coupon = await couponsService.getOne(route.params.couponId as string);
      form.code = coupon.code;
      form.discountType = coupon.discountType;
      form.discountValue = coupon.discountValue;
      form.currency = coupon.currency || 'USD';
      form.maxRedemptions = coupon.maxRedemptions ?? null;
      form.validFrom = coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 10) : null;
      form.validUntil = coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 10) : null;
      form.applicablePlanIds = [...(coupon.applicablePlanIds || [])];
      form.isActive = coupon.isActive;
    } catch {
      ElMessage.error(t('Failed to load coupon'));
      router.push({ name: 'coupons' });
    } finally {
      loading.value = false;
    }
  }
});

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  form.code = code;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const payload: any = {
    code: form.code.toUpperCase(),
    discountType: form.discountType,
    discountValue: form.discountValue,
    currency: form.currency,
    maxRedemptions: form.maxRedemptions,
    validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
    validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
    applicablePlanIds: form.applicablePlanIds,
    isActive: form.isActive,
  };

  try {
    if (isEdit.value) {
      await couponsStore.update(route.params.couponId as string, payload);
      ElMessage.success(t('Coupon updated'));
    } else {
      await couponsStore.create(payload);
      ElMessage.success(t('Coupon created'));
    }
    router.push({ name: 'coupons' });
  } catch {
    ElMessage.error(t('Failed to save coupon'));
  }
}
</script>

<template>
  <div class="coupon-form-page" v-loading="loading">
    <div class="form-header">
      <el-page-header @back="router.push({ name: 'coupons' })">
        <template #content>
          <span class="page-title">{{ isEdit ? t('Edit Coupon') : t('Create Coupon') }}</span>
        </template>
      </el-page-header>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="default" class="coupon-form">
      <el-card shadow="never">
        <template #header>
          <span>{{ t('Coupon Details') }}</span>
        </template>

        <el-form-item :label="t('Coupon Code')" prop="code">
          <div class="code-input-row">
            <el-input v-model="form.code" :placeholder="t('e.g. SUMMER2026')" style="text-transform: uppercase" />
            <el-button @click="generateCode" plain>
              <font-awesome-icon :icon="['fas', 'dice']" />
              {{ t('Generate') }}
            </el-button>
          </div>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item :label="t('Discount Type')">
              <el-select v-model="form.discountType" style="width: 100%">
                <el-option :label="t('Percentage')" value="percentage" />
                <el-option :label="t('Fixed Amount')" value="fixed" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('Discount Value')" prop="discountValue">
              <el-input-number
                v-model="form.discountValue"
                :min="0"
                :max="form.discountType === 'percentage' ? 100 : undefined"
                :precision="form.discountType === 'percentage' ? 0 : 2"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('Currency')" v-if="form.discountType === 'fixed'">
              <el-select v-model="form.currency" style="width: 100%">
                <el-option v-for="c in ['USD','EUR','GBP','ILS','JPY','CAD','AUD']" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="t('Status')">
          <el-switch v-model="form.isActive" :active-text="t('Active')" :inactive-text="t('Inactive')" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="form-section">
        <template #header>
          <span>{{ t('Redemption Limits') }}</span>
        </template>

        <el-form-item :label="t('Max Redemptions')">
          <el-input-number
            v-model="form.maxRedemptions"
            :min="0"
            controls-position="right"
            :placeholder="t('Unlimited')"
            style="width: 200px"
          />
          <span class="hint">{{ t('Leave empty for unlimited') }}</span>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('Valid From')">
              <el-date-picker
                v-model="form.validFrom"
                type="date"
                :placeholder="t('Start date')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('Valid Until')">
              <el-date-picker
                v-model="form.validUntil"
                type="date"
                :placeholder="t('End date')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card shadow="never" class="form-section">
        <template #header>
          <span>{{ t('Applicable Plans') }}</span>
        </template>

        <el-form-item :label="t('Plans')">
          <el-select
            v-model="form.applicablePlanIds"
            multiple
            :placeholder="t('All plans (leave empty for all)')"
            style="width: 100%"
          >
            <el-option
              v-for="opt in planOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-card>

      <div class="form-actions">
        <el-button @click="router.push({ name: 'coupons' })">{{ t('Cancel') }}</el-button>
        <el-button type="primary" @click="submit" :loading="couponsStore.saving">
          {{ isEdit ? t('Update Coupon') : t('Create Coupon') }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.coupon-form-page {
  padding: 20px;
  max-width: 800px;
}

.form-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.coupon-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.code-input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.form-section {
  margin-top: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-bottom: 40px;
}

.hint {
  margin-inline-start: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
