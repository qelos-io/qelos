<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Delete } from '@element-plus/icons-vue';
import { useConfigurationsList } from '../compositions/configurations';
import configurationsService from '@/services/apis/configurations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import { useWsConfiguration } from '../store/ws-configuration';
import { useMcpConfiguration } from '../store/mcp-configuration';
import { useUsersHeader } from '../store/users-header';
import {
  REQUIRED_CONFIGURATIONS,
  buildConfigurationsView,
  type ConfigurationInfo,
  type ListedConfiguration,
} from '../services/configuration-registry';

const props = defineProps<{ visibility: '' | 'public' | 'private'; searchQuery: string }>();

const router = useRouter();
const { t, locale } = useI18n();
const { list, retry } = useConfigurationsList();

// ---- every tenant gets the standard configurations on first visit ----
const ensuring = ref(false);
const ensured = new Set<string>();

watch(
  list,
  async (configs) => {
    if (!Array.isArray(configs) || ensuring.value) return;
    const missing = Object.keys(REQUIRED_CONFIGURATIONS).filter((key) => !ensured.has(key) && !configs.some((config) => config.key === key));
    if (!missing.length) return;
    ensuring.value = true;
    try {
      for (const key of missing) {
        const definition = REQUIRED_CONFIGURATIONS[key];
        await configurationsService.create({
          key,
          public: definition.public,
          kind: definition.kind,
          description: definition.description,
          metadata: JSON.parse(JSON.stringify(definition.metadata)),
        });
        ensured.add(key);
      }
      await retry();
    } catch (error) {
      console.error('[settings] could not create the standard configurations', error);
    } finally {
      ensuring.value = false;
    }
  },
  { immediate: true },
);

const view = computed(() =>
  buildConfigurationsView((list.value as ListedConfiguration[]) || [], { query: props.searchQuery, visibility: props.visibility, translate: t }),
);
const isEmpty = computed(() => !!list.value && !view.value.groups.length && !view.value.custom.length);

// a small status chip for the configurations where "is it on?" is the first question.
// The list endpoint does not return the values, so the status comes from the stores that already load them.
const wsConfig = useWsConfiguration();
const mcpConfig = useMcpConfiguration();
const { usersHeader } = useUsersHeader();

function statusOf(info: ConfigurationInfo) {
  if (info.key === 'workspace-configuration') return { on: !!wsConfig.isActive, label: wsConfig.isActive ? t('Active') : t('Inactive') };
  if (info.key === 'mcp-configuration') return { on: !!mcpConfig.isEnabled, label: mcpConfig.isEnabled ? t('Enabled') : t('Disabled') };
  if (info.key === 'users-header') return { on: !!usersHeader.value?.active, label: usersHeader.value?.active ? t('Active') : t('Inactive') };
  return null;
}

const now = new Date();
const updated = (config?: ListedConfiguration) => {
  const value = (config?.updated || (config as any)?.updatedAt) as string | undefined;
  return value ? formatRelative(value, now, locale.value || undefined) : '';
};

const open = (info: ConfigurationInfo) => router.push(info.route || { name: 'editConfiguration', params: { key: info.key } });

const { submit: removeFn } = useSubmitting((config: ListedConfiguration) => configurationsService.remove(config.key), {
  success: 'Configuration removed successfully',
  error: 'Failed to remove configuration',
}, retry);
const remove = useConfirmAction(removeFn);
</script>

<template>
  <div class="list">
    <el-skeleton v-if="!list" :rows="6" animated />

    <el-empty v-else-if="isEmpty" :image-size="90" :description="$t('No settings match your search.')" />

    <template v-else>
      <section v-for="group in view.groups" :key="group.key" class="group" :aria-label="$t(group.label)">
        <h2 class="group-label">{{ $t(group.label) }}</h2>
        <ul class="rows">
          <li v-for="{ info, config } in group.rows" :key="info.key">
            <a href="#" class="row" @click.prevent="open(info)">
              <span class="icon" aria-hidden="true"><font-awesome-icon :icon="info.icon" /></span>
              <span class="text">
                <span class="title">{{ $t(info.title) }}</span>
                <span class="description">{{ $t(info.description) }}</span>
              </span>
              <el-tag v-if="statusOf(info)" :type="statusOf(info)!.on ? 'success' : 'info'" effect="light" size="small">{{ statusOf(info)!.label }}</el-tag>
              <span v-if="updated(config)" class="when">{{ updated(config) }}</span>
              <font-awesome-icon :icon="['fas', 'chevron-right']" class="go" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>

      <section v-if="view.custom.length" class="group" :aria-label="$t('Custom & system')">
        <h2 class="group-label">{{ $t('Custom & system') }}</h2>
        <ul class="rows">
          <li v-for="config in view.custom" :key="config.key" class="custom-row">
            <router-link class="row" :to="{ name: 'editConfiguration', params: { key: config.key } }">
              <span class="text">
                <code class="key" dir="ltr">{{ config.key }}</code>
                <span v-if="config.description" class="description">{{ config.description }}</span>
              </span>
              <span v-if="config.kind" class="kind" dir="ltr">{{ config.kind }}</span>
              <el-tag :type="config.public ? 'success' : 'info'" effect="light" size="small">{{ config.public ? $t('Public') : $t('Private') }}</el-tag>
              <span v-if="updated(config)" class="when">{{ updated(config) }}</span>
            </router-link>
            <el-button class="remove" text circle type="danger" :aria-label="`${$t('Remove')}: ${config.key}`" @click="remove(config)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.list {
  display: flex;
  flex-direction: column;
  gap: 22px;
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
  overflow: hidden;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);

  li + li {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.row {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 14px;
  min-inline-size: 0;
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
  text-align: start;
}

.key {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
}

.kind {
  flex: none;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.when {
  flex: none;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.go {
  flex: none;
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

[dir='rtl'] .go {
  transform: scaleX(-1);
}

.custom-row {
  display: flex;
  align-items: center;
  padding-inline-end: 8px;
}

@media (max-width: 639px) {
  .row {
    flex-wrap: wrap;
    gap: 6px 10px;
    padding-inline: 12px;
  }

  .when,
  .kind {
    display: none;
  }
}
</style>
