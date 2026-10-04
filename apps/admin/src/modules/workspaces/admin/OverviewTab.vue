<script lang="ts" setup>
defineOptions({ inheritAttrs: false });
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import type { IPlan, ISubscription } from '@qelos/global-types';
import WorkspaceDetailsForm from '../components/WorkspaceDetailsForm.vue';
import type { WorkspaceDetails } from '../components/WorkspaceDetailsForm.vue';
import { formatDate, subscriptionStatusTagType } from '@/modules/pricing-plans/services/pricing';

const props = defineProps<{
  workspace: any;
  adminsCount: number;
  membersLoading: boolean;
  subscription: ISubscription | null;
  plan?: IPlan;
  /** persists a partial update; resolves to whether it succeeded */
  save: (patch: Record<string, unknown>) => Promise<boolean>;
}>();

const { t } = useI18n();
const router = useRouter();

function fromWorkspace(): WorkspaceDetails {
  return { name: props.workspace.name || '', logo: props.workspace.logo || '', labels: [...(props.workspace.labels || [])] };
}

const form = ref<WorkspaceDetails>(fromWorkspace());
const saving = ref(false);
const errors = ref<{ name?: string }>({});

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(fromWorkspace()));

// pick up server changes (after a save or a refresh) unless the admin is mid-edit
watch(() => props.workspace, () => {
  if (!dirty.value) form.value = fromWorkspace();
});

async function submit() {
  if (!form.value.name.trim()) {
    errors.value = { name: t('Workspace name is required') };
    return;
  }
  errors.value = {};
  saving.value = true;
  const ok = await props.save({ name: form.value.name.trim(), logo: form.value.logo, labels: form.value.labels });
  saving.value = false;
  if (ok) form.value = fromWorkspace();
}

function discard() {
  form.value = fromWorkspace();
  errors.value = {};
}

// leaving with unsaved edits asks first
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(
      t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'),
      { type: 'warning', confirmButtonText: t('Leave'), cancelButtonText: t('Stay') },
    );
    return true;
  } catch {
    return false;
  }
});

const warnOnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};
onMounted(() => window.addEventListener('beforeunload', warnOnUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnOnUnload));

const membersCount = computed(() => props.workspace.members?.length ?? 0);
const invitesCount = computed(() => props.workspace.invites?.length ?? 0);
const goTo = (name: string) => router.push({ name, params: { id: props.workspace._id } });
</script>

<template>
  <div class="overview-tab">
    <div class="stats">
      <button type="button" class="stat" @click="goTo('adminEditWorkspaceBilling')">
        <span class="stat-label">{{ t('Plan') }}</span>
        <template v-if="subscription">
          <strong class="stat-value">{{ plan?.name || '—' }}</strong>
          <span class="stat-sub">
            <el-tag :type="subscriptionStatusTagType[subscription.status] || 'info'" size="small" effect="light">{{ t(subscription.status) }}</el-tag>
            <template v-if="subscription.currentPeriodEnd">{{ t('renews {date}', { date: formatDate(subscription.currentPeriodEnd) }) }}</template>
          </span>
        </template>
        <template v-else>
          <strong class="stat-value muted">{{ t('No plan attached') }}</strong>
          <span class="stat-sub link">{{ t('Attach to Plan') }}</span>
        </template>
      </button>

      <button type="button" class="stat" @click="goTo('adminEditWorkspaceMembers')">
        <span class="stat-label">{{ t('Members') }}</span>
        <strong class="stat-value">{{ membersCount }}</strong>
        <span class="stat-sub">{{ membersLoading ? '…' : t('{count} admins', { count: adminsCount }) }}</span>
      </button>

      <button type="button" class="stat" @click="goTo('adminEditWorkspaceMembers')">
        <span class="stat-label">{{ t('Pending invites') }}</span>
        <strong class="stat-value">{{ invitesCount }}</strong>
        <span class="stat-sub link">{{ t('Manage invites') }}</span>
      </button>

      <div class="stat static">
        <span class="stat-label">{{ t('Created') }}</span>
        <strong class="stat-value">{{ formatDate(workspace.created) }}</strong>
      </div>
    </div>

    <el-card shadow="never">
      <template #header><span>{{ t('Workspace Details') }}</span></template>
      <WorkspaceDetailsForm v-model="form" :errors="errors" @keyup.enter="submit" />
    </el-card>

    <transition name="fade">
      <div v-if="dirty" class="save-bar" role="status">
        <span>{{ t('You have unsaved changes') }}</span>
        <span class="save-bar-actions">
          <el-button :disabled="saving" @click="discard">{{ t('Discard') }}</el-button>
          <el-button type="primary" :loading="saving" @click="submit">{{ t('Save') }}</el-button>
        </span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.overview-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  text-align: start;
  font: inherit;
  color: inherit;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

button.stat:hover {
  border-color: var(--el-color-primary-light-5);
}

.stat.static {
  cursor: default;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-value {
  font-size: 1.35rem;
  line-height: 1.2;
}

.stat-value.muted {
  font-size: 1rem;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.stat-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stat-sub.link {
  color: var(--el-color-primary);
}

.save-bar {
  position: sticky;
  inset-block-end: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  box-shadow: var(--el-box-shadow);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
