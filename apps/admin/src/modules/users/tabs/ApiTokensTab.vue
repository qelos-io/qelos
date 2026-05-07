<template>
  <div class="api-tokens-tab">
    <el-card class="tokens-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <font-awesome-icon :icon="['fas', 'key']" class="header-icon" />
            <span>{{ $t('API Tokens') }}</span>
          </div>
          <el-button type="primary" size="small" @click="showCreateDialog = true">
            <font-awesome-icon :icon="['fas', 'plus']" class="btn-icon" />
            <span>{{ $t('Create Token') }}</span>
          </el-button>
        </div>
      </template>

      <el-table :data="tokens" v-loading="loading" :empty-text="$t('No API tokens created yet')" table-layout="auto">
        <el-table-column :label="$t('Name')" prop="nickname" min-width="140" show-overflow-tooltip />
        <el-table-column :label="$t('Token')" min-width="140">
          <template #default="{ row }">
            <code class="token-prefix" dir="ltr">{{ maskTokenPrefix(row.tokenPrefix) }}</code>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Created')" min-width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('Expires')" min-width="110">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expiresAt) }">
              {{ formatDate(row.expiresAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Last Used')" min-width="150">
          <template #default="{ row }">
            {{ row.lastUsedAt ? formatDateTime(row.lastUsedAt) : $t('Never') }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('Workspace')" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ workspaceScopeLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('Uses')" width="88" align="right">
          <template #default="{ row }">
            <span :title="$t('Successful authentications with this API key')">{{ usageCount(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Actions')" width="88" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" plain @click="confirmDelete(row)">
              <font-awesome-icon :icon="['fas', 'trash']" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create Token Dialog -->
    <el-dialog v-model="showCreateDialog" :title="$t('Create API Token')" width="520px" @closed="resetCreateForm">
      <el-form :model="createForm" label-position="top">
        <el-form-item :label="$t('Token Name')" required>
          <el-input v-model="createForm.nickname" :placeholder="$t('e.g., CI/CD Pipeline')" />
        </el-form-item>
        <el-form-item :label="$t('Workspace scope')">
          <el-select
            v-model="createForm.workspaceId"
            clearable
            filterable
            :loading="workspacesLoading"
            :placeholder="$t('All workspaces')"
            style="width: 100%"
          >
            <el-option
              v-for="ws in workspaces"
              :key="ws._id"
              :label="ws.name"
              :value="ws._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('Expiration')">
          <div class="expiration-presets">
            <el-button
              v-for="preset in expirationPresets"
              :key="preset.label"
              :type="selectedPreset === preset.label ? 'primary' : 'default'"
              size="small"
              @click="setExpiration(preset)"
            >{{ preset.label }}</el-button>
          </div>
          <el-date-picker
            v-model="createForm.expiresAt"
            type="datetime"
            :placeholder="$t('Custom expiration')"
            style="width: 100%; margin-top: 8px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">{{ $t('Create') }}</el-button>
      </template>
    </el-dialog>

    <!-- Token Reveal Dialog -->
    <el-dialog v-model="showRevealDialog" :title="$t('Token Created')" width="500px" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        {{ $t('Copy this token now. It will not be shown again.') }}
      </el-alert>
      <div class="token-reveal">
        <el-input :model-value="revealedToken" readonly dir="ltr">
          <template #append>
            <el-button @click="copyToken">
              <font-awesome-icon :icon="['fas', 'copy']" />
            </el-button>
          </template>
        </el-input>
      </div>
      <template #footer>
        <el-button type="primary" @click="closeReveal">{{ $t('Done') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { api, getCallData } from '@/services/apis/api';
import workspacesService from '@/services/apis/workspaces-service';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { IApiToken } from '@qelos/sdk/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

const { t } = useI18n();

defineProps({
  user: Object,
  userId: String,
  submitting: Boolean,
});

const tokens = ref<IApiToken[]>([]);
const workspaces = ref<IWorkspace[]>([]);
const workspacesLoading = ref(false);
const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const showRevealDialog = ref(false);
const revealedToken = ref('');
const selectedPreset = ref('');

const createForm = ref({
  nickname: '',
  workspaceId: '' as string,
  expiresAt: null as Date | null,
});

const expirationPresets = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
];

function setExpiration(preset: { label: string; days: number }) {
  selectedPreset.value = preset.label;
  const date = new Date();
  date.setDate(date.getDate() + preset.days);
  createForm.value.expiresAt = date;
}

function resetCreateForm() {
  createForm.value = { nickname: '', workspaceId: '', expiresAt: null };
  selectedPreset.value = '';
}

function maskTokenPrefix(prefix: string) {
  const safe = prefix || '';
  return `${safe}••••••••`;
}

function workspaceScopeLabel(row: IApiToken): string {
  const ws = row.workspace;
  if (ws == null) return t('All workspaces');
  if (typeof ws === 'string') return ws;
  return ws.name || ws._id || '—';
}

function usageCount(row: IApiToken) {
  return row.usageCount ?? 0;
}

async function loadWorkspaces() {
  workspacesLoading.value = true;
  try {
    workspaces.value = await workspacesService.getAll();
  } catch {
    ElMessage.error(t('Failed to load workspaces'));
  } finally {
    workspacesLoading.value = false;
  }
}

async function loadTokens() {
  loading.value = true;
  try {
    tokens.value = await api.get('/api/me/api-tokens').then(getCallData);
  } catch {
    ElMessage.error(t('Failed to load API tokens'));
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!createForm.value.nickname || !createForm.value.expiresAt) {
    ElMessage.warning(t('Please fill in token name and expiration'));
    return;
  }
  creating.value = true;
  try {
    const body: Record<string, unknown> = {
      nickname: createForm.value.nickname,
      expiresAt: createForm.value.expiresAt.toISOString(),
    };
    if (createForm.value.workspaceId) {
      body.workspace = createForm.value.workspaceId;
    }

    const result = await api.post('/api/me/api-tokens', body).then(getCallData) as { token: string };

    revealedToken.value = result.token;
    showCreateDialog.value = false;
    showRevealDialog.value = true;
    await loadTokens();
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || t('Failed to create token'));
  } finally {
    creating.value = false;
  }
}

async function confirmDelete(token: IApiToken) {
  try {
    await ElMessageBox.confirm(
      t('Revoke token "{name}" ({prefix}...)?', { name: token.nickname, prefix: token.tokenPrefix }),
      t('Confirm Revoke'),
      { type: 'warning', confirmButtonClass: 'el-button--danger' }
    );
    await api.delete(`/api/me/api-tokens/${token._id}`);
    ElMessage.success(t('Token revoked'));
    await loadTokens();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('Failed to revoke token'));
    }
  }
}

function copyToken() {
  navigator.clipboard.writeText(revealedToken.value);
  ElMessage.success(t('Token copied to clipboard'));
}

function closeReveal() {
  revealedToken.value = '';
  showRevealDialog.value = false;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

onMounted(() => {
  loadWorkspaces();
  loadTokens();
});
</script>

<style scoped>
.tokens-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
}

.header-icon {
  color: var(--el-color-primary);
}

.btn-icon {
  margin-right: 4px;
}

.token-prefix {
  font-family: monospace;
  font-size: 0.85rem;
  background: var(--el-fill-color-light, #f5f7fa);
  padding: 2px 6px;
  border-radius: 4px;
}

.text-danger {
  color: var(--el-color-danger);
}

.expiration-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.token-reveal {
  margin-top: 12px;
}

.token-reveal :deep(.el-input__inner) {
  font-family: monospace;
  font-size: 0.85rem;
}
</style>
