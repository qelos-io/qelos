<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import plansService from '@/services/apis/plans-service';
import { usePlansStore } from '../store/plans';
import PlanCard from '../components/PlanCard.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const plansStore = usePlansStore();

const isEdit = computed(() => !!route.params.planId);
const loading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  name: '',
  description: '',
  features: [] as string[],
  monthlyPrice: 0,
  yearlyPrice: 0,
  currency: 'USD',
  isActive: true,
  sortOrder: 0,
  limits: [] as Array<{ key: string; value: string }>,
});

const newFeature = ref('');
const newLimitKey = ref('');
const newLimitValue = ref('');

const rules = reactive<FormRules>({
  name: [{ required: true, message: t('Plan name is required'), trigger: 'blur' }],
  monthlyPrice: [{ required: true, message: t('Monthly price is required'), trigger: 'blur' }],
  yearlyPrice: [{ required: true, message: t('Yearly price is required'), trigger: 'blur' }],
});

const currencies = ['USD', 'EUR', 'GBP', 'ILS', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true;
    try {
      const plan = await plansService.getOne(route.params.planId as string);
      form.name = plan.name;
      form.description = plan.description || '';
      form.features = [...(plan.features || [])];
      form.monthlyPrice = plan.monthlyPrice;
      form.yearlyPrice = plan.yearlyPrice;
      form.currency = plan.currency || 'USD';
      form.isActive = plan.isActive;
      form.sortOrder = plan.sortOrder || 0;
      form.limits = Object.entries(plan.limits || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    } catch {
      ElMessage.error(t('Failed to load plan'));
      router.push({ name: 'pricing-plans' });
    } finally {
      loading.value = false;
    }
  }
});

function addFeature() {
  const val = newFeature.value.trim();
  if (val && !form.features.includes(val)) {
    form.features.push(val);
    newFeature.value = '';
  }
}

function removeFeature(index: number) {
  form.features.splice(index, 1);
}

function addLimit() {
  const key = newLimitKey.value.trim();
  const value = newLimitValue.value.trim();
  if (key && value) {
    form.limits.push({ key, value });
    newLimitKey.value = '';
    newLimitValue.value = '';
  }
}

function removeLimit(index: number) {
  form.limits.splice(index, 1);
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const limitsObj: Record<string, any> = {};
  for (const { key, value } of form.limits) {
    const num = Number(value);
    limitsObj[key] = isNaN(num) ? (value === 'true' ? true : value === 'false' ? false : value) : num;
  }

  const payload = {
    name: form.name,
    description: form.description,
    features: form.features,
    monthlyPrice: form.monthlyPrice,
    yearlyPrice: form.yearlyPrice,
    currency: form.currency,
    isActive: form.isActive,
    sortOrder: form.sortOrder,
    limits: limitsObj,
  };

  try {
    if (isEdit.value) {
      await plansStore.update(route.params.planId as string, payload);
      ElMessage.success(t('Plan updated'));
    } else {
      await plansStore.create(payload as any);
      ElMessage.success(t('Plan created'));
    }
    router.push({ name: 'pricing-plans' });
  } catch {
    ElMessage.error(t('Failed to save plan'));
  }
}

const planPreview = computed(() => ({
  name: form.name || t('Plan Name'),
  description: form.description,
  features: form.features,
  monthlyPrice: form.monthlyPrice,
  yearlyPrice: form.yearlyPrice,
  currency: form.currency,
  isActive: form.isActive,
}));
</script>

<template>
  <div class="plan-form-page" v-loading="loading">
    <div class="form-header">
      <el-page-header @back="router.push({ name: 'pricing-plans' })">
        <template #content>
          <span class="page-title">{{ isEdit ? t('Edit Plan') : t('Create Plan') }}</span>
        </template>
      </el-page-header>
    </div>

    <div class="form-layout">
      <div class="form-main">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="default">
          <el-card shadow="never">
            <template #header>
              <span>{{ t('Basic Information') }}</span>
            </template>

            <el-form-item :label="t('Plan Name')" prop="name">
              <el-input v-model="form.name" :placeholder="t('e.g. Pro, Business, Enterprise')" />
            </el-form-item>

            <el-form-item :label="t('Description')">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                :placeholder="t('Describe what this plan offers')"
              />
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item :label="t('Sort Order')">
                  <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="t('Status')">
                  <el-switch v-model="form.isActive" :active-text="t('Active')" :inactive-text="t('Inactive')" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <el-card shadow="never" class="form-section">
            <template #header>
              <span>{{ t('Pricing') }}</span>
            </template>

            <el-form-item :label="t('Currency')">
              <el-select v-model="form.currency" style="width: 160px">
                <el-option v-for="c in currencies" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="t('Monthly Price')" prop="monthlyPrice">
                  <el-input-number
                    v-model="form.monthlyPrice"
                    :min="0"
                    :precision="2"
                    :step="1"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('Yearly Price')" prop="yearlyPrice">
                  <el-input-number
                    v-model="form.yearlyPrice"
                    :min="0"
                    :precision="2"
                    :step="1"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <el-card shadow="never" class="form-section">
            <template #header>
              <span>{{ t('Features') }}</span>
            </template>

            <div class="tag-list">
              <el-tag
                v-for="(feature, idx) in form.features"
                :key="idx"
                closable
                @close="removeFeature(idx)"
                class="feature-tag"
              >
                {{ feature }}
              </el-tag>
            </div>
            <div class="add-row">
              <el-input
                v-model="newFeature"
                :placeholder="t('Add a feature')"
                @keyup.enter="addFeature"
                size="default"
              />
              <el-button @click="addFeature" type="primary" plain size="default">
                <font-awesome-icon :icon="['fas', 'plus']" />
              </el-button>
            </div>
          </el-card>

          <el-card shadow="never" class="form-section">
            <template #header>
              <span>{{ t('Limits') }}</span>
            </template>

            <div v-if="form.limits.length" class="limits-list">
              <div v-for="(limit, idx) in form.limits" :key="idx" class="limit-row">
                <el-input v-model="limit.key" :placeholder="t('Key')" size="small" />
                <el-input v-model="limit.value" :placeholder="t('Value')" size="small" />
                <el-button size="small" type="danger" plain @click="removeLimit(idx)">
                  <font-awesome-icon :icon="['fas', 'times']" />
                </el-button>
              </div>
            </div>
            <div class="add-row">
              <el-input v-model="newLimitKey" :placeholder="t('Key')" @keyup.enter="addLimit" />
              <el-input v-model="newLimitValue" :placeholder="t('Value')" @keyup.enter="addLimit" />
              <el-button @click="addLimit" type="primary" plain size="default">
                <font-awesome-icon :icon="['fas', 'plus']" />
              </el-button>
            </div>
          </el-card>

          <div class="form-actions">
            <el-button @click="router.push({ name: 'pricing-plans' })">{{ t('Cancel') }}</el-button>
            <el-button type="primary" @click="submit" :loading="plansStore.saving">
              {{ isEdit ? t('Update Plan') : t('Create Plan') }}
            </el-button>
          </div>
        </el-form>
      </div>

      <div class="form-preview">
        <h3>{{ t('Preview') }}</h3>
        <PlanCard :plan="planPreview" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-form-page {
  padding: 20px;
  max-width: 1200px;
}

.form-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.form-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.form-main {
  flex: 1;
  min-width: 0;
}

.form-preview {
  width: 320px;
  position: sticky;
  top: 20px;
  flex-shrink: 0;
}

.form-preview h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.form-section {
  margin-top: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.feature-tag {
  font-size: 13px;
}

.add-row {
  display: flex;
  gap: 8px;
}

.limits-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.limit-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-bottom: 40px;
}

@media (max-width: 900px) {
  .form-layout {
    flex-direction: column;
  }

  .form-preview {
    width: 100%;
    position: static;
  }
}
</style>
