<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue';
import { authStore } from '@/modules/core/store/auth';
import { impersonateUser } from '@/services/sdk';
import { usePlansStore } from '@/modules/pricing-plans/store/plans';
import { useCouponsStore } from '@/modules/pricing-plans/store/coupons';
import { useEntitySubscriptions } from '@/modules/pricing-plans/compositions/entity-subscriptions';
import { subscriptionStatusTagType } from '@/modules/pricing-plans/services/pricing';
import { useAdminWorkspace, memberName } from './compositions/admin-workspace';
import DeleteWorkspaceDialog from './components/DeleteWorkspaceDialog.vue';
import useAdminWorkspacesList from './store/admin-workspaces-list';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const workspaceId = computed(() => route.params.id as string);
const {
  workspace, members, loading, membersLoading, notFound, failed, adminsCount, reload, loadMembers, save,
} = useAdminWorkspace(workspaceId);

// plan chip in the header; the billing tab reports changes back through `billing-changed`
const { plans } = storeToRefs(usePlansStore());
const { coupons } = storeToRefs(useCouponsStore());
const { current: subscription, reload: reloadSubscription } = useEntitySubscriptions('workspace', toRef(workspaceId));
const plan = computed(() => plans.value?.find((item) => item._id === subscription.value?.planId));
const coupon = computed(() => coupons.value?.find((item) => item._id === subscription.value?.couponId));

const TABS = [
  { name: 'overview', route: 'adminEditWorkspaceOverview', icon: 'gauge', label: 'Overview' },
  { name: 'members', route: 'adminEditWorkspaceMembers', icon: 'users', label: 'Members' },
  { name: 'billing', route: 'adminEditWorkspaceBilling', icon: 'credit-card', label: 'Billing' },
  { name: 'settings', route: 'adminEditWorkspaceSettings', icon: 'gear', label: 'Settings' },
] as const;

const activeTab = computed(() => TABS.find((tab) => tab.route === route.name)?.name || 'overview');

function onTabChange(name: string | number) {
  const tab = TABS.find((item) => item.name === name);
  if (tab && tab.route !== route.name) router.push({ name: tab.route, params: { id: workspaceId.value } });
}

const breadcrumbItems = computed(() => [
  { text: t('Workspaces'), icon: ['fas', 'layer-group'], to: { name: 'adminWorkspaces' } },
  ...(workspace.value ? [{ text: workspace.value.name }] : []),
]);

const initials = computed(() => (workspace.value?.name || '?').trim().slice(0, 2).toUpperCase());
const createdAt = computed(() => workspace.value?.created ? new Date(workspace.value.created).toLocaleDateString() : '');

async function copyId() {
  try {
    await navigator.clipboard.writeText(workspaceId.value);
    ElMessage.success(t('Copied'));
  } catch {
    ElMessage.error(t('Copy failed'));
  }
}

// ---- view as a member ----
const impersonatable = computed(() => members.value.filter((member) => member.user !== authStore.user?._id));

function viewAs(member: (typeof members.value)[number]) {
  impersonateUser(
    { _id: member.user, name: memberName(member), email: member.email },
    { _id: workspace.value._id, name: workspace.value.name },
  );
  ElMessage.success(t('Now viewing as {name}', { name: memberName(member) }));
  setTimeout(() => window.location.reload(), 500);
}

// ---- save details (Overview tab) ----
async function saveWorkspace(patch: Record<string, unknown>) {
  try {
    await save(patch);
    ElMessage.success(t('Workspace updated successfully'));
    return true;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || t('Failed to update Workspace'));
    return false;
  }
}

// ---- delete ----
const deleteOpen = ref(false);
const workspacesList = useAdminWorkspacesList();

async function onDeleted() {
  await workspacesList.reload();
  router.push({ name: 'adminWorkspaces' });
}

function onMenuCommand(command: string) {
  if (command === 'copy-id') copyId();
  if (command === 'delete') deleteOpen.value = true;
}
</script>

<template>
  <div class="admin-workspace-page">
    <Breadcrumb :items="breadcrumbItems" />

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-result
      v-else-if="notFound || failed"
      :icon="notFound ? 'warning' : 'error'"
      :title="notFound ? t('Workspace not found') : t('Failed to load the workspace')"
      :sub-title="notFound ? t('It may have been deleted.') : t('Please try again.')"
    >
      <template #extra>
        <el-button v-if="failed" @click="reload">{{ t('Retry') }}</el-button>
        <el-button type="primary" @click="router.push({ name: 'adminWorkspaces' })">{{ t('Back to workspaces') }}</el-button>
      </template>
    </el-result>

    <template v-else-if="workspace">
      <el-card shadow="never" class="workspace-header">
        <div class="header-main">
          <el-avatar :size="64" shape="square" :src="workspace.logo || undefined" class="header-avatar">{{ initials }}</el-avatar>

          <div class="header-info">
            <h1 dir="auto">{{ workspace.name }}</h1>
            <div v-if="workspace.labels?.length" class="header-labels">
              <el-tag v-for="label in workspace.labels" :key="label" size="small" effect="plain">{{ label }}</el-tag>
            </div>
            <div class="header-meta">
              <span v-if="createdAt">{{ t('Created') }} {{ createdAt }}</span>
              <span>{{ t('{count} members', { count: workspace.members?.length ?? 0 }) }}</span>
              <el-tooltip :content="t('Copy ID')" placement="top">
                <button type="button" class="id-button" @click="copyId">
                  <code>{{ workspaceId }}</code>
                  <font-awesome-icon :icon="['far', 'copy']" />
                </button>
              </el-tooltip>
            </div>
            <div class="header-plan">
              <router-link :to="{ name: 'adminEditWorkspaceBilling', params: { id: workspaceId } }" class="plan-chip">
                <template v-if="subscription">
                  <strong>{{ plan?.name || t('Plan') }}</strong>
                  <el-tag :type="subscriptionStatusTagType[subscription.status] || 'info'" size="small" effect="light">
                    {{ t(subscription.status) }}
                  </el-tag>
                  <el-tag v-if="coupon" type="warning" size="small" effect="plain">{{ coupon.code }}</el-tag>
                </template>
                <el-tag v-else type="info" size="small" effect="plain">{{ t('No plan attached') }}</el-tag>
              </router-link>
            </div>
          </div>

          <div class="header-actions">
            <el-dropdown trigger="click" :disabled="!impersonatable.length" max-height="320px" @command="viewAs">
              <el-button :disabled="!impersonatable.length">
                <font-awesome-icon :icon="['fas', 'user-secret']" class="icon-left" />
                {{ t('View as…') }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="member in impersonatable" :key="member.user" :command="member">
                    <span class="view-as-item">
                      <span>{{ memberName(member) }}</span>
                      <small>{{ member.roles?.join(', ') }}</small>
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-dropdown trigger="click" @command="onMenuCommand">
              <el-button :aria-label="t('More actions')"><font-awesome-icon :icon="['fas', 'ellipsis']" /></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="copy-id">{{ t('Copy ID') }}</el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="danger-item">{{ t('Delete workspace') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-card>

      <el-tabs :model-value="activeTab" class="workspace-tabs" @tab-change="onTabChange">
        <el-tab-pane v-for="tab in TABS" :key="tab.name" :name="tab.name">
          <template #label>
            <font-awesome-icon :icon="['fas', tab.icon]" class="tab-icon" />
            {{ t(tab.label) }}
            <el-badge v-if="tab.name === 'members' && workspace.members?.length" :value="workspace.members.length" type="info" class="tab-badge" />
          </template>
        </el-tab-pane>
      </el-tabs>

      <router-view v-slot="{ Component }">
        <component
          :is="Component"
          :workspace="workspace"
          :members="members"
          :members-loading="membersLoading"
          :admins-count="adminsCount"
          :subscription="subscription"
          :plan="plan"
          :save="saveWorkspace"
          @refresh="reload"
          @refresh-members="loadMembers"
          @billing-changed="reloadSubscription"
          @request-delete="deleteOpen = true"
        />
      </router-view>

      <DeleteWorkspaceDialog v-model="deleteOpen" :workspace="workspace" :subscription-id="subscription?._id" @deleted="onDeleted" />
    </template>
  </div>
</template>

<style scoped>
.admin-workspace-page {
  padding: 20px;
  max-inline-size: 1200px;
  margin-inline: auto;
}

.workspace-header {
  margin-block-end: 8px;
}

.header-main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
}

.header-avatar {
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 600;
}

.header-info {
  flex: 1 1 280px;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-info h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.header-labels,
.header-meta,
.header-plan {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.header-meta {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.id-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.id-button:hover {
  color: var(--el-color-primary);
}

.plan-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-left {
  margin-inline-end: 6px;
}

.view-as-item {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.view-as-item small {
  color: var(--el-text-color-secondary);
}

.tab-icon {
  margin-inline-end: 6px;
}

.tab-badge {
  margin-inline-start: 6px;
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}

@media (max-width: 768px) {
  .admin-workspace-page {
    padding: 12px;
  }
}
</style>
