<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useMcpConfiguration } from '@/modules/configurations/store/mcp-configuration';
import { CONFIGURATION_GROUPS, CONFIGURATION_INFO } from '@/modules/configurations/services/configuration-registry';

const { t } = useI18n();
const wsConfig = useWsConfiguration();
const mcpConfig = useMcpConfiguration();

// the same registry as the Settings page, so the two never drift apart
const groups = computed(() =>
  CONFIGURATION_GROUPS.map((group) => ({
    key: group.key,
    label: t(group.label),
    rows: CONFIGURATION_INFO.filter((info) => info.group === group.key).map((info) => ({
      key: info.key,
      title: t(info.title),
      description: t(info.description),
      icon: info.icon,
      to: info.route || { name: 'editConfiguration', params: { key: info.key } },
      status:
        info.key === 'workspace-configuration'
          ? { label: wsConfig.isActive ? t('Active') : t('Inactive'), on: !!wsConfig.isActive }
          : info.key === 'mcp-configuration'
            ? { label: mcpConfig.isEnabled ? t('Enabled') : t('Disabled'), on: !!mcpConfig.isEnabled }
            : undefined,
    })),
  })).filter((group) => group.rows.length),
);
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
    <router-link :to="{ name: 'configurations' }" class="all">{{ $t('See all settings') }}</router-link>
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

.all {
  align-self: flex-start;
  color: var(--el-color-primary);
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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
