<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCouponValidation } from '../compositions/use-billing'
import { ICoupon } from '@qelos/global-types'

const { t } = useI18n()

const props = defineProps<{
  planId?: string
}>()

const emit = defineEmits<{
  validated: [coupon: ICoupon | null]
}>()

const couponCode = ref('')
const { validatedCoupon, loading, error, validate, reset } = useCouponValidation()

async function handleApply() {
  await validate(couponCode.value, props.planId)
  emit('validated', validatedCoupon.value)
}

function handleClear() {
  couponCode.value = ''
  reset()
  emit('validated', null)
}

const discountLabel = computed(() => {
  if (!validatedCoupon.value) return ''
  const c = validatedCoupon.value
  if (c.discountType === 'percentage') return `${c.discountValue}% ${t('off')}`
  const currency = c.currency || 'USD'
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(c.discountValue)
  return `${formatted} ${t('off')}`
})

watch(() => props.planId, () => {
  if (validatedCoupon.value) {
    handleApply()
  }
})
</script>

<template>
  <div class="coupon-input">
    <div class="coupon-field">
      <el-input
        v-model="couponCode"
        :placeholder="t('Enter coupon code')"
        :disabled="!!validatedCoupon"
        clearable
        @clear="handleClear"
        @keyup.enter="handleApply"
      >
        <template #prefix>
          <font-awesome-icon :icon="['fas', 'tag']" />
        </template>
      </el-input>
      <el-button
        v-if="!validatedCoupon"
        type="primary"
        plain
        :loading="loading"
        :disabled="!couponCode.trim()"
        @click="handleApply"
      >
        {{ t('Apply') }}
      </el-button>
      <el-button
        v-else
        type="danger"
        plain
        @click="handleClear"
      >
        {{ t('Remove') }}
      </el-button>
    </div>

    <div v-if="validatedCoupon" class="coupon-success">
      <font-awesome-icon :icon="['fas', 'check-circle']" class="success-icon" />
      <span>{{ t('Coupon applied') }}: <strong>{{ discountLabel }}</strong></span>
    </div>

    <div v-if="error" class="coupon-error">
      <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="error-icon" />
      <span>{{ typeof error === 'string' ? error : t('Invalid coupon code') }}</span>
    </div>
  </div>
</template>

<style scoped>
.coupon-input {
  width: 100%;
}

.coupon-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.coupon-field .el-input {
  max-width: 300px;
}

.coupon-success {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-color-success);
}

.success-icon {
  font-size: 14px;
}

.coupon-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-color-danger);
}

.error-icon {
  font-size: 14px;
}
</style>
