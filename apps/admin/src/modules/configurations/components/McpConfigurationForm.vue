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
        <p class="hints-title">{{ $t('Known MCP client patterns') }}</p>
        <ul class="hints-list">
          <li v-for="hint in callbackHints" :key="hint.id">
            <strong>{{ $t(hint.labelKey) }}</strong>
            <code dir="ltr">{{ hint.example }}</code>
          </li>
        </ul>
      </div>

      <div v-if="!edited.permittedCallbackUrls.length" class="empty-state">
        <p>{{ $t('No callback URLs configured') }}</p>
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
          <el-input
            v-model="edited.permittedCallbackUrls[index]"
            dir="ltr"
            :placeholder="$t('MCP callback URL placeholder')"
          />
          <p v-if="detectCallbackUrlClient(url)" class="field-hint success-hint">
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
      </header>

      <el-table :data="edited.exposedTools" stripe class="tools-table">
        <el-table-column :label="$t('Tool')" min-width="180">
          <template #default="{ row }">
            <div class="tool-name-cell">
              <strong>{{ $t(getToolLabelKey(row.toolId)) }}</strong>
              <span class="tool-id" dir="ltr">{{ row.toolId }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('Enabled')" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>

        <el-table-column :label="$t('Roles')" min-width="180">
          <template #default="{ row }">
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
          </template>
        </el-table-column>

        <el-table-column :label="$t('Workspace roles')" min-width="180">
          <template #default="{ row }">
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
          </template>
        </el-table-column>

        <el-table-column :label="$t('Workspace labels')" min-width="180">
          <template #default="{ row }">
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
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div class="form-footer">
      <SaveButton :submitting="submitting" />
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useNotifications } from '@/modules/core/compositions/notifications';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import type { IMcpConfigurationMetadata, IMcpExposedTool } from '@qelos/global-types';
import { MCP_FORBIDDEN_TOOL_IDS } from '@qelos/global-types';
import { KNOWN_MCP_TOOLS } from '@/modules/configurations/constants/mcp-known-tools';
import {
  CALLBACK_URL_CLIENT_HINTS,
  detectCallbackUrlClient,
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

const callbackHints = CALLBACK_URL_CLIENT_HINTS;
const roleOptions = ['user', 'admin', 'editor', 'plugin'];
const workspaceRoleOptions = ['admin', 'member', 'user'];

const defaultMetadata: IMcpConfigurationMetadata = {
  enabled: false,
  permittedCallbackUrls: [],
  exposedTools: [],
  adminOnly: true,
};

const edited = ref<IMcpConfigurationMetadata>(normalizeMetadata(props.metadata));

const wsConfigActive = computed(() => wsConfig.isActive);

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

const forbiddenToolIds = new Set<string>(MCP_FORBIDDEN_TOOL_IDS);

function mergeExposedTools(saved: IMcpExposedTool[] = []): IMcpExposedTool[] {
  const savedById = new Map(
    saved.filter((tool) => !forbiddenToolIds.has(tool.toolId)).map((tool) => [tool.toolId, tool]),
  );
  const knownIds = new Set(KNOWN_MCP_TOOLS.map((tool) => tool.toolId));

  const merged = KNOWN_MCP_TOOLS.map(({ toolId }) => {
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
  };
}

function getToolLabelKey(toolId: string): string {
  return KNOWN_MCP_TOOLS.find((tool) => tool.toolId === toolId)?.labelKey || toolId;
}

function addCallbackUrl() {
  edited.value.permittedCallbackUrls = [...edited.value.permittedCallbackUrls, ''];
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

.callback-hints {
  margin-block-end: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
}

.hints-title {
  margin: 0 0 8px;
  font-weight: 600;
}

.hints-list {
  margin: 0;
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
}

.field-hint {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.success-hint {
  color: var(--el-color-success);
}

.tools-table {
  width: 100%;
}

.tool-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-id {
  font-size: 12px;
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
}
</style>
