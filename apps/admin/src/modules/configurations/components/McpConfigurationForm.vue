<template>
  <el-form @submit.native.prevent="save" class="mcp-configuration-form">
    <el-alert
      v-if="!edited.enabled"
      type="warning"
      :title="$t('MCP is disabled')"
      :description="$t('MCP disabled description')"
      show-icon
      :closable="false"
      class="disabled-banner"
    />

    <section class="panel">
      <header class="panel-header">
        <div>
          <p class="panel-eyebrow">{{ $t('General') }}</p>
          <h2>{{ $t('MCP server settings') }}</h2>
          <p class="panel-description">{{ $t('MCP general description') }}</p>
        </div>
        <div class="status-tags">
          <el-tag :type="edited.enabled ? 'success' : 'info'" effect="dark">
            {{ edited.enabled ? $t('Enabled') : $t('Disabled') }}
          </el-tag>
          <el-tag v-if="edited.adminOnly" type="warning" effect="light">
            {{ $t('Admin only') }}
          </el-tag>
        </div>
      </header>

      <McpEndpointPanel variant="full" :muted="!edited.enabled" class="connection-details" />

      <div class="summary-stats">
        <div class="stat-card" :class="{ 'stat-card-attention': !edited.permittedCallbackUrls.length && edited.enabled }">
          <span class="stat-value">{{ edited.permittedCallbackUrls.length }}</span>
          <span class="stat-label">{{ $t('Callback URLs') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ enabledToolsCount }} / {{ edited.exposedTools.length }}</span>
          <span class="stat-label">{{ $t('Tools enabled') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ edited.adminOnly ? $t('Admins') : $t('All users') }}</span>
          <span class="stat-label">{{ $t('Who can connect') }}</span>
        </div>
      </div>

      <FormRowGroup>
        <FormInput
          v-model="edited.enabled"
          title="Enable MCP server"
          type="switch"
          description="Expose Qelos tools to remote MCP clients for this tenant"
        />
        <FormInput
          v-model="edited.adminOnly"
          title="Admin-only access"
          type="switch"
          description="Restrict MCP sessions to admin or privileged users"
        />
      </FormRowGroup>

      <el-collapse class="advanced-collapse">
        <el-collapse-item :title="$t('Advanced server settings')" name="advanced">
          <FormRowGroup>
            <FormInput
              v-model="edited.serverName"
              title="Server name"
              type="text"
              placeholder="qelos-mcp"
              label="Optional"
            />
            <FormInput
              v-model="edited.serverVersion"
              title="Server version"
              type="text"
              placeholder="1.0.0"
              label="Optional"
            />
          </FormRowGroup>

          <FormRowGroup>
            <FormInput
              v-model="edited.loginUrl"
              title="Login URL"
              type="text"
              placeholder="https://admin.example.com/login"
              label="Optional"
              description="URL shown to MCP clients when authentication is required. Defaults to the admin panel login page."
            />
          </FormRowGroup>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section class="panel" :class="{ 'panel-muted': !edited.enabled }">
      <header class="panel-header compact">
        <div>
          <p class="panel-eyebrow">{{ $t('OAuth') }}</p>
          <h3>{{ $t('Permitted callback URLs') }}</h3>
          <p class="panel-description">{{ $t('MCP callback URLs description') }}</p>
        </div>
        <el-button type="primary" plain native-type="button" @click="addCallbackUrl">
          <el-icon><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
          {{ $t('Add callback URL') }}
        </el-button>
      </header>

      <div class="callback-hints">
        <div class="hints-header">
          <p class="hints-title">{{ $t('Known MCP client patterns') }}</p>
          <p class="hints-subtitle">{{ $t('MCP callback suggestions hint') }}</p>
        </div>
        <div class="hint-chips" role="list">
          <button
            v-for="hint in clickableCallbackHints"
            :key="hint.id"
            type="button"
            class="hint-chip"
            :class="{ 'hint-chip-added': isSuggestedCallbackAdded(hint.example) }"
            :disabled="!edited.enabled || isSuggestedCallbackAdded(hint.example)"
            :title="hint.example"
            role="listitem"
            @click="addSuggestedCallbackUrl(hint.example)"
          >
            <span class="hint-chip-label">{{ $t(hint.labelKey) }}</span>
            <code class="hint-chip-url" dir="ltr">{{ hint.example }}</code>
            <span v-if="isSuggestedCallbackAdded(hint.example)" class="hint-chip-badge">
              {{ $t('MCP callback suggestion added') }}
            </span>
            <span v-else class="hint-chip-action">{{ $t('MCP callback suggestion add') }}</span>
          </button>
        </div>
        <details class="hint-patterns">
          <summary>{{ $t('MCP callback generic patterns') }}</summary>
          <ul class="hints-list">
            <li v-for="hint in genericCallbackHints" :key="hint.id">
              <strong>{{ $t(hint.labelKey) }}</strong>
              <code dir="ltr">{{ hint.example }}</code>
            </li>
          </ul>
        </details>
      </div>

      <div v-if="!edited.permittedCallbackUrls.length" class="empty-state">
        <p>{{ $t('No callback URLs configured') }}</p>
        <el-button type="primary" plain native-type="button" @click="addCallbackUrl">
          {{ $t('Add callback URL') }}
        </el-button>
      </div>

      <div
        v-for="(url, index) in edited.permittedCallbackUrls"
        :key="`callback-${index}`"
        class="callback-row"
      >
        <el-form-item
          class="callback-input"
          :error="callbackErrors[index]"
          :label="`${$t('Callback URL')} ${index + 1}`"
        >
          <el-input v-model="edited.permittedCallbackUrls[index]" dir="ltr" :placeholder="$t('MCP callback URL placeholder')">
            <template #suffix>
              <el-tooltip v-if="url" :content="$t('Copy to clipboard')" placement="top">
                <font-awesome-icon
                  :icon="['fas', 'copy']"
                  class="copy-icon"
                  @click.stop="copyCallbackUrl(url)"
                />
              </el-tooltip>
            </template>
          </el-input>
          <p v-if="detectCallbackUrlClient(url)" class="field-hint success-hint">
            <font-awesome-icon :icon="['fas', 'check-circle']" />
            {{ $t('Matches') }}: {{ $t(detectCallbackUrlClient(url)!.labelKey) }}
          </p>
        </el-form-item>
        <RemoveButton wide :label="$t('Remove')" @click="removeCallbackUrl(index)" />
      </div>
    </section>

    <section class="panel" :class="{ 'panel-muted': !edited.enabled }">
      <header class="panel-header compact">
        <div>
          <p class="panel-eyebrow">{{ $t('Tools') }}</p>
          <h3>{{ $t('Exposed MCP tools') }}</h3>
          <p class="panel-description">{{ $t('MCP exposed tools description') }}</p>
        </div>
        <div class="tools-actions">
          <span class="tools-count-badge">{{ $t('MCP tools enabled count', { enabled: enabledToolsCount, total: edited.exposedTools.length }) }}</span>
          <el-button size="small" native-type="button" @click="setAllToolsEnabled(true)">
            {{ $t('Enable all') }}
          </el-button>
          <el-button size="small" native-type="button" @click="setAllToolsEnabled(false)">
            {{ $t('Disable all') }}
          </el-button>
        </div>
      </header>

      <el-input
        v-model="toolsSearch"
        class="tools-search"
        clearable
        :prefix-icon="Search"
        :placeholder="$t('Search tools')"
      />

      <div v-if="!filteredExposedTools.length" class="empty-state">
        <p>{{ $t('No tools match your search') }}</p>
      </div>

      <div class="tool-cards">
        <div
          v-for="row in filteredExposedTools"
          :key="row.toolId"
          class="tool-card"
          :class="{ 'tool-card-enabled': row.enabled }"
        >
          <div class="tool-card-header">
            <div class="tool-name-cell">
              <div class="tool-name-line">
                <strong>{{ getToolLabel(row.toolId) }}</strong>
                <el-tooltip :content="getToolDescription(row.toolId)" placement="top">
                  <el-icon class="tool-info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <span class="tool-id" dir="ltr">{{ row.toolId }}</span>
            </div>
            <el-switch v-model="row.enabled" />
          </div>

          <div class="tool-card-body" :class="{ 'tool-card-body-disabled': !row.enabled }">
            <div class="tool-field">
              <label>{{ $t('Roles') }}</label>
              <el-select
                v-model="row.roles"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('Select or type roles')"
                style="width: 100%"
              >
                <el-option :label="$t('All roles')" value="*" />
                <el-option v-for="role in roleOptions" :key="role" :label="role" :value="role" />
              </el-select>
            </div>

            <div class="tool-field">
              <label>{{ $t('Workspace roles') }}</label>
              <el-select
                v-model="row.wsRoles"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('Select or type workspace roles')"
                style="width: 100%"
                :disabled="!wsConfigActive"
              >
                <el-option :label="$t('All workspace roles')" value="*" />
                <el-option v-for="role in workspaceRoleOptions" :key="role" :label="role" :value="role" />
              </el-select>
            </div>

            <div class="tool-field">
              <label>{{ $t('Workspace labels') }}</label>
              <el-select
                v-model="row.wsLabels"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('Select or type workspace labels')"
                style="width: 100%"
                :disabled="!wsConfigActive"
              >
                <el-option
                  v-for="label in workspaceLabelOptions"
                  :key="label"
                  :label="label"
                  :value="label"
                />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="form-footer">
      <SaveButton :submitting="submitting" />
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search, QuestionFilled } from '@element-plus/icons-vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import McpEndpointPanel from '@/modules/configurations/components/McpEndpointPanel.vue';
import { useNotifications } from '@/modules/core/compositions/notifications';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import type { IMcpConfigurationMetadata, IMcpExposedTool } from '@qelos/global-types';
import { MCP_FORBIDDEN_TOOL_IDS, IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { KNOWN_MCP_TOOLS } from '@/modules/configurations/constants/mcp-known-tools';
import {
  CALLBACK_URL_CLIENT_HINTS,
  CLICKABLE_CALLBACK_CLIENT_HINTS,
  detectCallbackUrlClient,
  isCallbackUrlInList,
  isValidCallbackUrl,
} from '@/modules/configurations/services/mcp-callback-url-validation';

const props = defineProps({
  kind: String,
  metadata: Object as () => IMcpConfigurationMetadata,
  submitting: Boolean,
});

const emit = defineEmits(['save']);

const { t: $t } = useI18n();
const notifications = useNotifications();
const wsConfig = useWsConfiguration();
const integrationsStore = useIntegrationsStore();

const clickableCallbackHints = CLICKABLE_CALLBACK_CLIENT_HINTS;
const genericCallbackHints = CALLBACK_URL_CLIENT_HINTS.filter((hint) => hint.clickable === false);
const roleOptions = ['user', 'admin', 'editor', 'plugin'];
const workspaceRoleOptions = ['admin', 'member', 'user'];

const forbiddenToolIds = new Set<string>(MCP_FORBIDDEN_TOOL_IDS);

const defaultMetadata: IMcpConfigurationMetadata = {
  enabled: false,
  permittedCallbackUrls: [],
  exposedTools: [],
  adminOnly: true,
  loginUrl: '',
};

// Must be declared before `edited` — normalizeMetadata() (called synchronously below)
// reads mcpToolIntegrations.value via mergeExposedTools() to seed dynamic tool rows.
const mcpToolIntegrations = computed(() =>
  (integrationsStore.integrations || []).filter(
    (integration) =>
      integration.active &&
      integration.kind?.[0] === IntegrationSourceKind.Qelos &&
      integration.trigger?.operation === QelosTriggerOperation.mcpTool,
  ),
);

const edited = ref<IMcpConfigurationMetadata>(normalizeMetadata(props.metadata));
const toolsSearch = ref('');

const wsConfigActive = computed(() => wsConfig.isActive);

const integrationToolMeta = computed(() => {
  const map = new Map<string, { label: string; description: string }>();
  mcpToolIntegrations.value.forEach((integration) => {
    map.set(`integration:${integration._id}`, {
      label: integration.trigger.details?.name || integration._id,
      description: integration.trigger.details?.description || '',
    });
  });
  return map;
});

const enabledToolsCount = computed(
  () => edited.value.exposedTools.filter((tool) => tool.enabled).length,
);

const filteredExposedTools = computed(() => {
  const query = toolsSearch.value.trim().toLowerCase();
  if (!query) {
    return edited.value.exposedTools;
  }
  return edited.value.exposedTools.filter((tool) => {
    const label = getToolLabel(tool.toolId).toLowerCase();
    return tool.toolId.toLowerCase().includes(query) || label.includes(query);
  });
});

const workspaceLabelOptions = computed(() => {
  const labels = wsConfig.metadata.labels || [];
  return [...new Set(labels.flatMap((label) => label.value || []))];
});

const callbackErrors = computed(() =>
  edited.value.permittedCallbackUrls.map((url) => {
    const trimmed = url.trim();
    if (!trimmed) {
      return $t('Callback URL is required');
    }
    if (!isValidCallbackUrl(trimmed)) {
      return $t('Invalid callback URL format');
    }
    return '';
  }),
);

function defaultExposedTool(toolId: string): IMcpExposedTool {
  return {
    toolId,
    enabled: false,
    roles: [],
    wsRoles: [],
    wsLabels: [],
  };
}

function mergeExposedTools(saved: IMcpExposedTool[] = []): IMcpExposedTool[] {
  const savedById = new Map(
    saved.filter((tool) => !forbiddenToolIds.has(tool.toolId)).map((tool) => [tool.toolId, tool]),
  );
  const dynamicToolIds = mcpToolIntegrations.value.map((integration) => `integration:${integration._id}`);
  const knownIds = new Set([...KNOWN_MCP_TOOLS.map((tool) => tool.toolId), ...dynamicToolIds]);

  const merged = [...KNOWN_MCP_TOOLS.map((tool) => tool.toolId), ...dynamicToolIds].map((toolId) => {
    const existing = savedById.get(toolId);
    return existing ? { ...defaultExposedTool(toolId), ...existing, toolId } : defaultExposedTool(toolId);
  });

  for (const tool of saved) {
    if (!knownIds.has(tool.toolId) && !forbiddenToolIds.has(tool.toolId)) {
      merged.push({ ...defaultExposedTool(tool.toolId), ...tool, toolId: tool.toolId });
    }
  }

  return merged;
}

function normalizeMetadata(metadata?: Partial<IMcpConfigurationMetadata>): IMcpConfigurationMetadata {
  const source = metadata || {};
  return {
    ...defaultMetadata,
    ...source,
    permittedCallbackUrls: [...(source.permittedCallbackUrls || [])],
    exposedTools: mergeExposedTools(source.exposedTools),
    serverName: source.serverName || '',
    serverVersion: source.serverVersion || '',
    loginUrl: source.loginUrl || '',
  };
}

function getToolLabelKey(toolId: string): string {
  return KNOWN_MCP_TOOLS.find((tool) => tool.toolId === toolId)?.labelKey || toolId;
}

function getToolDescriptionKey(toolId: string): string {
  return KNOWN_MCP_TOOLS.find((tool) => tool.toolId === toolId)?.descriptionKey || toolId;
}

// Dynamic (integration-backed) tool labels/descriptions are admin-provided free text,
// not i18n keys, so they're resolved directly instead of passing through $t(...).
function getToolLabel(toolId: string): string {
  const dynamic = integrationToolMeta.value.get(toolId);
  return dynamic ? dynamic.label : $t(getToolLabelKey(toolId));
}

function getToolDescription(toolId: string): string {
  const dynamic = integrationToolMeta.value.get(toolId);
  return dynamic ? dynamic.description : $t(getToolDescriptionKey(toolId));
}

watch(mcpToolIntegrations, () => {
  edited.value.exposedTools = mergeExposedTools(edited.value.exposedTools);
});

function setAllToolsEnabled(enabled: boolean) {
  edited.value.exposedTools = edited.value.exposedTools.map((tool) => ({ ...tool, enabled }));
}

function copyCallbackUrl(url: string) {
  navigator.clipboard.writeText(url);
  notifications.success($t('Copied to clipboard'));
}

function addCallbackUrl() {
  edited.value.permittedCallbackUrls = [...edited.value.permittedCallbackUrls, ''];
}

function isSuggestedCallbackAdded(url: string): boolean {
  return isCallbackUrlInList(url, edited.value.permittedCallbackUrls);
}

function addSuggestedCallbackUrl(url: string) {
  if (!edited.value.enabled || isSuggestedCallbackAdded(url)) {
    return;
  }

  if (!isValidCallbackUrl(url)) {
    notifications.error($t('Invalid callback URL format'));
    return;
  }

  edited.value.permittedCallbackUrls = [...edited.value.permittedCallbackUrls, url];
}

function removeCallbackUrl(index: number) {
  edited.value.permittedCallbackUrls.splice(index, 1);
}

function validate(): boolean {
  const urls = edited.value.permittedCallbackUrls.map((url) => url.trim()).filter(Boolean);

  if (edited.value.enabled && urls.length === 0) {
    notifications.error($t('At least one callback URL is required when MCP is enabled'));
    return false;
  }

  const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
  if (duplicates.length > 0) {
    notifications.error($t('Duplicate callback URLs are not allowed'));
    return false;
  }

  if (urls.some((url) => !isValidCallbackUrl(url))) {
    notifications.error($t('Fix invalid callback URLs before saving'));
    return false;
  }

  return true;
}

function save() {
  if (!validate()) {
    return;
  }

  const payload: IMcpConfigurationMetadata = {
    ...edited.value,
    permittedCallbackUrls: edited.value.permittedCallbackUrls.map((url) => url.trim()).filter(Boolean),
    exposedTools: edited.value.exposedTools
      .filter((tool) => !forbiddenToolIds.has(tool.toolId))
      .map((tool) => ({
      toolId: tool.toolId,
      enabled: !!tool.enabled,
      roles: [...(tool.roles || [])],
      wsRoles: [...(tool.wsRoles || [])],
      wsLabels: [...(tool.wsLabels || [])],
    })),
    serverName: edited.value.serverName?.trim() || undefined,
    serverVersion: edited.value.serverVersion?.trim() || undefined,
    loginUrl: edited.value.loginUrl?.trim() || undefined,
  };

  emit('save', payload);
}
</script>

<style scoped>
.mcp-configuration-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px;
}

.disabled-banner {
  margin-block-end: 4px;
}

.panel {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  background: var(--background-color, #fff);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.panel-muted {
  opacity: 0.85;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-block-end: 16px;
}

.panel-header.compact {
  margin-block-end: 12px;
}

.panel-eyebrow {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin: 0;
  font-weight: 600;
}

.panel-description {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  max-width: 640px;
}

.status-tags {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.connection-details {
  margin-block-end: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-block-end: 20px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
}

.stat-card-attention {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.advanced-collapse {
  margin-block-start: 4px;
  border: none;
}

.advanced-collapse :deep(.el-collapse-item__header) {
  border-block-end: none;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.advanced-collapse :deep(.el-collapse-item__wrap) {
  border-block-end: none;
}

.callback-hints {
  margin-block-end: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
}

.hints-header {
  margin-block-end: 12px;
}

.hints-title {
  margin: 0;
  font-weight: 600;
}

.hints-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hint-chips {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.hint-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--background-color, #fff);
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.hint-chip:not(:disabled):hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.hint-chip:disabled {
  cursor: default;
  opacity: 0.72;
}

.hint-chip-added {
  border-color: var(--el-color-success-light-5);
  background: var(--el-color-success-light-9);
}

.hint-chip-label {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.hint-chip-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.hint-chip-action,
.hint-chip-badge {
  font-size: 12px;
  font-weight: 600;
}

.hint-chip-action {
  color: var(--el-color-primary);
}

.hint-chip-badge {
  color: var(--el-color-success);
}

.hint-patterns {
  margin-block-start: 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hint-patterns summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.hints-list {
  margin: 10px 0 0;
  padding-inline-start: 18px;
  display: grid;
  gap: 8px;
}

.hints-list code {
  display: inline-block;
  margin-inline-start: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.callback-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-block-end: 8px;
}

.callback-input {
  flex: 1;
  margin: 0;
}

.empty-state {
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
  margin-block-end: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.success-hint {
  color: var(--el-color-success);
}

.copy-icon {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: color 0.15s ease;
}

.copy-icon:hover {
  color: var(--el-color-primary);
}

.tools-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tools-count-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--el-fill-color-lighter);
}

.tools-search {
  margin-block-end: 16px;
  max-width: 320px;
}

.tool-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.tool-card {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  background: var(--background-color, #fff);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tool-card-enabled {
  border-color: var(--el-color-success-light-5);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.tool-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-block-end: 12px;
}

.tool-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-info-icon {
  color: var(--el-text-color-secondary);
  cursor: help;
  font-size: 14px;
}

.tool-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tool-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: opacity 0.15s ease;
}

.tool-card-body-disabled {
  opacity: 0.55;
}

.tool-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.form-footer {
  position: sticky;
  inset-block-end: 0;
  padding-block: 16px;
  display: flex;
  justify-content: flex-end;
  background: linear-gradient(to top, var(--el-bg-color, #ffffff) 85%, rgba(255, 255, 255, 0));
  border-block-start: 1px solid var(--el-border-color-light, #e4e7ed);
  z-index: 5;
  backdrop-filter: blur(6px);
}

@media (max-width: 768px) {
  .callback-row {
    flex-direction: column;
  }

  .panel {
    padding: 18px;
  }

  .tool-cards {
    grid-template-columns: 1fr;
  }

  .tools-search {
    max-width: none;
  }
}
</style>
