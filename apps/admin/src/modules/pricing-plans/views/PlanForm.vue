<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { storeToRefs } from 'pinia';
import type { FormInstance, FormRules } from 'element-plus';
import plansService from '@/services/apis/plans-service';
import { usePlansStore } from '../store/plans';
import { useWorkspaceSubscriptionsStore, WorkspaceSubscriptionRow } from '../store/workspace-subscriptions';
import PlanCard from '../components/PlanCard.vue';
import { BillingCycle } from '@qelos/global-types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const plansStore = usePlansStore();
const workspaceSubscriptionsStore = useWorkspaceSubscriptionsStore();
const { rows: workspaceRows, loading: workspaceRowsLoading, saving: attachingWorkspace } = storeToRefs(workspaceSubscriptionsStore);

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
  dynamic: false,
});

const newFeature = ref('');
const newLimitKey = ref('');
const newLimitValue = ref('');

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('Plan name is required'), trigger: 'blur' }],
  ...(form.dynamic
    ? {}
    : {
        monthlyPrice: [{ required: true, message: t('Monthly price is required'), trigger: 'blur' }],
        yearlyPrice: [{ required: true, message: t('Yearly price is required'), trigger: 'blur' }],
      }),
}));

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
      form.dynamic = plan.dynamic ?? false;
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
    dynamic: form.dynamic,
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

const planId = computed(() => route.params.planId as string);

const attachedWorkspaces = computed(() =>
  workspaceRows.value.filter((row) => row.subscription?.planId?._id === planId.value)
);

const availableWorkspaces = computed(() =>
  workspaceRows.value.filter((row) => row.subscription?.planId?._id !== planId.value)
);

const selectedWorkspaceId = ref('');
const selectedBillingCycle = ref<BillingCycle>('monthly');

async function attachWorkspace() {
  if (!selectedWorkspaceId.value) {
    ElMessage.warning(t('Please select a workspace'));
    return;
  }

  const row = availableWorkspaces.value.find((r) => r.workspace._id === selectedWorkspaceId.value);

  try {
    if (row?.subscription) {
      await workspaceSubscriptionsStore.changePlan(
        selectedWorkspaceId.value,
        row.subscription._id,
        planId.value,
        selectedBillingCycle.value
      );
    } else {
      await workspaceSubscriptionsStore.attachToPlan(selectedWorkspaceId.value, planId.value, selectedBillingCycle.value);
    }
    ElMessage.success(t('Workspace attached to plan'));
    selectedWorkspaceId.value = '';
  } catch {
    ElMessage.error(t('Failed to attach workspace'));
  }
}

async function detachWorkspace(row: WorkspaceSubscriptionRow) {
  if (!row.subscription) return;

  try {
    await ElMessageBox.confirm(
      t('This will cancel the subscription and detach the workspace from this plan.'),
      t('Detach workspace from plan'),
      { type: 'warning', confirmButtonText: t('Detach'), cancelButtonText: t('Cancel') }
    );
  } catch {
    return;
  }

  try {
    await workspaceSubscriptionsStore.detach(row.subscription._id);
    ElMessage.success(t('Workspace detached from plan'));
  } catch {
    ElMessage.error(t('Failed to detach workspace'));
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
  dynamic: form.dynamic,
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

            <el-form-item :label="t('Dynamic Pricing')">
              <el-switch v-model="form.dynamic" :active-text="t('Enabled')" :inactive-text="t('Disabled')" />
              <div v-if="form.dynamic" class="dynamic-hint">
                {{ t('The amount will be calculated at payment time') }}
              </div>
            </el-form-item>

            <el-form-item :label="t('Currency')">
              <el-select v-model="form.currency" style="width: 160px">
                <el-option v-for="c in currencies" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>

            <el-row v-if="!form.dynamic" :gutter="16">
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

          <el-card v-if="isEdit" shadow="never" class="form-section" v-loading="workspaceRowsLoading">
            <template #header>
              <span>{{ t('Workspaces on this Plan') }}</span>
            </template>

            <el-table v-if="attachedWorkspaces.length" :data="attachedWorkspaces" row-key="workspace._id" size="small">
              <el-table-column :label="t('Workspace')" min-width="160">
                <template #default="{ row }">{{ row.workspace.name }}</template>
              </el-table-column>
              <el-table-column :label="t('Status')" width="120">
                <template #default="{ row }">{{ t(row.subscription.status) }}</template>
              </el-table-column>
              <el-table-column :label="t('Billing Cycle')" width="140">
                <template #default="{ row }">{{ t(row.subscription.billingCycle) }}</template>
              </el-table-column>
              <el-table-column :label="t('Actions')" width="100">
                <template #default="{ row }">
                  <el-button size="small" type="danger" plain @click="detachWorkspace(row)">
                    {{ t('Detach') }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else :description="t('No workspaces attached yet')" :image-size="60" />

            <div class="add-row attach-workspace-row">
              <el-select
                v-model="selectedWorkspaceId"
                filterable
                :placeholder="t('Select a workspace to attach')"
                style="flex: 1"
              >
                <el-option
                  v-for="row in availableWorkspaces"
                  :key="row.workspace._id"
                  :label="row.workspace.name"
                  :value="row.workspace._id"
                />
              </el-select>
              <el-select v-model="selectedBillingCycle" style="width: 140px">
                <el-option :label="t('Monthly')" value="monthly" />
                <el-option :label="t('Yearly')" value="yearly" />
              </el-select>
              <el-button type="primary" plain :loading="attachingWorkspace" @click="attachWorkspace">
                {{ t('Attach') }}
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

.attach-workspace-row {
  margin-top: 16px;
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

.dynamic-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
