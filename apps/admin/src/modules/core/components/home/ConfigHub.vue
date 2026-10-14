<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useMcpConfiguration } from '@/modules/configurations/store/mcp-configuration';

const { t } = useI18n();
const wsConfig = useWsConfiguration();
const mcpConfig = useMcpConfiguration();

interface Row {
  key: string;
  title: string;
  description: string;
  icon: string[];
  to: any;
  status?: { label: string; on: boolean };
}

const groups = computed<{ key: string; label: string; rows: Row[] }[]>(() => [
  {
    key: 'app',
    label: t('Your application'),
    rows: [
      { key: 'appearance', title: t('Appearance'), description: t('Themes, colors, typography, and design tokens'), icon: ['fas', 'palette'], to: { name: 'appearance' } },
      { key: 'app', title: t('App Settings'), description: t('Configure application name, logo, and general settings'), icon: ['fas', 'gear'], to: { name: 'editConfiguration', params: { key: 'app-configuration' } } },
      { key: 'auth', title: t('Authentication Settings'), description: t('Configure authentication methods, providers, and security settings'), icon: ['fas', 'key'], to: { name: 'editConfiguration', params: { key: 'auth-configuration' } } },
      { key: 'ssr', title: t('SSR Scripts'), description: t('Manage server-side rendering scripts and HTML templates'), icon: ['fab', 'html5'], to: { name: 'editConfiguration', params: { key: 'ssr-scripts' } } },
    ],
  },
  {
    key: 'business',
    label: t('People & money'),
    rows: [
      {
        key: 'workspaces',
        title: t('Workspace Settings'),
        description: t('Configure workspace defaults, permissions and structure'),
        icon: ['far', 'building'],
        to: { name: 'editConfiguration', params: { key: 'workspace-configuration' } },
        status: { label: wsConfig.isActive ? t('Active') : t('Inactive'), on: !!wsConfig.isActive },
      },
      { key: 'payments', title: t('Payments & Plans'), description: t('Configure pricing plans, coupons, and payment providers'), icon: ['fas', 'tags'], to: { name: 'paymentsConfiguration' } },
    ],
  },
  {
    key: 'platform',
    label: t('Connections'),
    rows: [
      {
        key: 'mcp',
        title: t('MCP Configuration'),
        description: t('Configure remote MCP tool exposure and OAuth callback URLs'),
        icon: ['fas', 'plug'],
        to: { name: 'editConfiguration', params: { key: 'mcp-configuration' } },
        status: { label: mcpConfig.isEnabled ? t('Enabled') : t('Disabled'), on: !!mcpConfig.isEnabled },
      },
    ],
  },
]);
</script>

<template>
  <div class="hub">
    <section v-for="group in groups" :key="group.key" class="group" :aria-label="group.label">
      <h2 class="group-label">{{ group.label }}</h2>
      <ul class="rows">
        <li v-for="row in group.rows" :key="row.key">
          <router-link :to="row.to" class="row">
            <span class="icon" aria-hidden="true"><font-awesome-icon :icon="row.icon" /></span>
            <span class="text">
              <span class="title">{{ row.title }}</span>
              <span class="description">{{ row.description }}</span>
            </span>
            <el-tag v-if="row.status" :type="row.status.on ? 'success' : 'info'" effect="light" size="small">{{ row.status.label }}</el-tag>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="go" aria-hidden="true" />
          </router-link>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.hub {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-inline-size: 860px;
  padding: 16px 20px 32px;
}

.group-label {
  margin: 0 0 8px;
  padding-inline: 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  overflow: hidden;

  li + li {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-block-size: 64px;
  padding: 10px 16px;
  color: var(--el-text-color-primary);
  text-decoration: none;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.icon {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 38px;
  block-size: 38px;
  border-radius: calc(var(--border-radius, 6px) + 2px);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.title {
  font-weight: 600;
}

.description {
  color: var(--el-text-color-secondary);
  font-size: 0.86rem;
}

.go {
  flex: none;
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

[dir='rtl'] .go {
  transform: scaleX(-1);
}

@media (max-width: 639px) {
  .hub {
    padding: 12px;
  }

  .row {
    padding-inline: 12px;
  }
}
</style>
