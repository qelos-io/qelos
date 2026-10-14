<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { BillableEntityType, BillingCycle, ISubscription } from '@qelos/global-types';
import subscriptionsService from '@/services/apis/subscriptions-service';
import workspacesService from '@/services/apis/workspaces-service';
import usersService from '@/services/apis/users-service';
import { useEntityNames } from '../compositions/entity-names';
import { entityPageRoute } from '../services/entity-links';
import { isLiveSubscription } from '../services/pricing';

/**
 * The accounts attached to one plan. In a B2C tenant the accounts are users, in a B2B tenant
 * workspaces; the caller passes the mode, this card never mixes the two.
 */
const props = defineProps<{ planId: string; entityType: BillableEntityType }>();

const { t } = useI18n();
const { resolve, nameOf } = useEntityNames();
const isUser = computed(() => props.entityType === 'user');

const subscriptions = ref<ISubscription[]>([]);
const candidates = ref<{ id: string; label: string; hint?: string }[]>([]);
const loading = ref(true);
const saving = ref(false);
const selectedId = ref('');
const cycle = ref<BillingCycle>('monthly');

const liveByEntity = computed(() => {
  const map = new Map<string, ISubscription>();
  for (const subscription of subscriptions.value) {
    if (isLiveSubscription(subscription) && !map.has(subscription.billableEntityId)) {
      map.set(subscription.billableEntityId, subscription);
    }
  }
  return map;
});

const attached = computed(() => [...liveByEntity.value.values()].filter((subscription) => String(subscription.planId) === props.planId));
const available = computed(() => candidates.value.filter((candidate) => liveByEntity.value.get(candidate.id)?.planId?.toString() !== props.planId));

async function load() {
  loading.value = true;
  try {
    subscriptions.value = await subscriptionsService.list({ billableEntityType: props.entityType });
    await resolve(attached.value.map((subscription) => ({ type: props.entityType, id: subscription.billableEntityId })));
  } catch {
    subscriptions.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadCandidates() {
  try {
    if (isUser.value) {
      const users = ((await usersService.getAll()) as any[]) || [];
      candidates.value = users.map((user) => ({
        id: user._id,
        label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || user._id,
        hint: user.email,
      }));
    } else {
      const workspaces = ((await workspacesService.getOne('all')) as unknown as { _id: string; name: string }[]) || [];
      candidates.value = workspaces.map((workspace) => ({ id: workspace._id, label: workspace.name }));
    }
  } catch {
    candidates.value = [];
  }
}

onMounted(() => {
  load();
  loadCandidates();
});

async function attach() {
  if (!selectedId.value) {
    ElMessage.warning(t(isUser.value ? 'Please select a user' : 'Please select a workspace'));
    return;
  }
  saving.value = true;
  try {
    const previous = liveByEntity.value.get(selectedId.value);
    await subscriptionsService.create({
      planId: props.planId,
      billingCycle: cycle.value,
      billableEntityType: props.entityType,
      billableEntityId: selectedId.value,
      status: 'active',
    });
    // the old subscription is cancelled only after the new one was accepted
    if (previous?._id) await subscriptionsService.cancel(previous._id);
    ElMessage.success(t(isUser.value ? 'User attached to plan' : 'Workspace attached to plan'));
    selectedId.value = '';
    await load();
  } catch {
    ElMessage.error(t(isUser.value ? 'Failed to attach user' : 'Failed to attach workspace'));
  } finally {
    saving.value = false;
  }
}

async function detach(subscription: ISubscription) {
  try {
    await ElMessageBox.confirm(
      t(isUser.value ? 'This will cancel the subscription and detach the user from this plan.' : 'This will cancel the subscription and detach the workspace from this plan.'),
      t(isUser.value ? 'Detach user from plan' : 'Detach workspace from plan'),
      { type: 'warning', confirmButtonText: t('Detach'), cancelButtonText: t('Cancel') },
    );
  } catch {
    return;
  }
  try {
    await subscriptionsService.cancel(subscription._id as string);
    ElMessage.success(t(isUser.value ? 'User detached from plan' : 'Workspace detached from plan'));
    await load();
  } catch {
    ElMessage.error(t(isUser.value ? 'Failed to detach user' : 'Failed to detach workspace'));
  }
}
</script>

<template>
  <el-card shadow="never" class="accounts-card" v-loading="loading">
    <template #header>
      <span>{{ isUser ? $t('Users on this Plan') : $t('Workspaces on this Plan') }}</span>
    </template>

    <el-table v-if="attached.length" :data="attached" row-key="_id" size="small">
      <el-table-column :label="isUser ? $t('User') : $t('Workspace')" min-width="160">
        <template #default="{ row }">
          <router-link class="account-link" dir="auto" :to="entityPageRoute(entityType, row.billableEntityId)">
            {{ nameOf(entityType, row.billableEntityId) }}
          </router-link>
        </template>
      </el-table-column>
      <el-table-column :label="$t('Status')" width="120">
        <template #default="{ row }">{{ $t(row.status) }}</template>
      </el-table-column>
      <el-table-column :label="$t('Billing Cycle')" width="140">
        <template #default="{ row }">{{ $t(row.billingCycle) }}</template>
      </el-table-column>
      <el-table-column :label="$t('Actions')" width="100">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain @click="detach(row)">{{ $t('Detach') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else :description="isUser ? $t('No users attached yet') : $t('No workspaces attached yet')" :image-size="60" />

    <div class="attach-row">
      <el-select v-model="selectedId" filterable class="grow" :placeholder="isUser ? $t('Select a user to attach') : $t('Select a workspace to attach')" :aria-label="isUser ? $t('Select a user to attach') : $t('Select a workspace to attach')">
        <el-option v-for="candidate in available" :key="candidate.id" :label="candidate.label" :value="candidate.id">
          <span dir="auto">{{ candidate.label }}</span>
          <small v-if="candidate.hint" class="hint" dir="ltr">{{ candidate.hint }}</small>
        </el-option>
      </el-select>
      <el-select v-model="cycle" class="cycle" :aria-label="$t('Billing')">
        <el-option :label="$t('Monthly')" value="monthly" />
        <el-option :label="$t('Yearly')" value="yearly" />
      </el-select>
      <el-button type="primary" plain :loading="saving" @click="attach">{{ $t('Attach') }}</el-button>
    </div>
  </el-card>
</template>

<style scoped>
.accounts-card {
  margin-block-start: 16px;
}

.account-link {
  color: var(--el-color-primary);
  font-weight: 600;
  text-decoration: none;
}

.account-link:hover {
  text-decoration: underline;
}

.attach-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-block-start: 14px;
}

.grow {
  flex: 1 1 220px;
}

.cycle {
  inline-size: 140px;
}

.hint {
  margin-inline-start: 10px;
  color: var(--el-text-color-secondary);
}
</style>
