<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Delete, Edit, MoreFilled, Plus, View } from '@element-plus/icons-vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { IPlugin } from '@/services/types/plugin';
import { mfeKind, mfePageHref, summarizePlugin, type PluginSection } from '../services/plugin-effects';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePluginsList();

const plugins = computed(() => {
  const query = String(route.query.q || '').trim().toLowerCase();
  if (!query) return store.plugins;
  return store.plugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(query) ||
      plugin.description?.toLowerCase().includes(query) ||
      plugin.apiPath?.toLowerCase().includes(query),
  );
});

const remove = useConfirmAction(store.removePlugin);

const MAX_PAGE_LINKS = 3;

function effectChips(plugin: IPlugin) {
  const s = summarizePlugin(plugin);
  const chips: { key: string; label: string; section: PluginSection }[] = [];
  const add = (key: string, section: PluginSection, count: number, one: string, many: string) =>
    count && chips.push({ key, section, label: t(count === 1 ? one : many, { n: count }) });
  add('pages', 'ui', s.pages, '{n} page', '{n} pages');
  add('components', 'ui', s.components, '{n} component', '{n} components');
  add('modals', 'ui', s.modals, '{n} modal', '{n} modals');
  add('injectables', 'ui', s.injectables, '{n} HTML injection', '{n} HTML injections');
  if (s.proxy) chips.push({ key: 'proxy', section: 'endpoints', label: t('API proxy') });
  add('cruds', 'endpoints', s.cruds, '{n} data API', '{n} data APIs');
  add('events', 'events', s.events, '{n} event', '{n} events');
  return chips;
}

function pageLinks(plugin: IPlugin) {
  return (plugin.microFrontends || [])
    .filter((mfe) => mfeKind(mfe) === 'page' && mfe.active !== false)
    .map((mfe) => ({ name: mfe.name, href: mfePageHref(mfe)! }));
}

const open = (plugin: IPlugin, section?: PluginSection) =>
  router.push({ name: 'editPlugin', params: { pluginId: plugin._id }, query: section ? { section } : undefined });
</script>

<template>
  <div class="plugins">
    <ul v-if="store.loading && !store.loaded" class="list" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="row skeleton">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="h3" style="inline-size: 30%" />
            <el-skeleton-item variant="text" style="inline-size: 55%" />
          </template>
        </el-skeleton>
      </li>
    </ul>

    <div v-else-if="!plugins.length" class="empty">
      <el-empty :description="store.plugins.length ? $t('No plugin matches your search') : $t('No plugins yet')">
        <p v-if="!store.plugins.length" class="empty-hint" dir="auto">
          {{ $t('A plugin adds pages, endpoints, components or event listeners to your app, from your own code or an external service.') }}
        </p>
        <el-button v-if="!store.plugins.length" type="primary" :icon="Plus" @click="router.push({ query: { mode: 'quick-create' } })">{{ $t('Create plugin') }}</el-button>
      </el-empty>
    </div>

    <ul v-else class="list">
      <li v-for="plugin in plugins" :key="plugin._id" :id="'plugin-' + plugin._id" class="row">
        <div class="main">
          <router-link class="name" dir="auto" :to="{ name: 'editPlugin', params: { pluginId: plugin._id } }">{{ plugin.name }}</router-link>
          <p v-if="plugin.description" class="description" dir="auto">{{ plugin.description }}</p>

          <ul v-if="effectChips(plugin).length" class="chips" :aria-label="$t('What this plugin adds')">
            <li v-for="chip in effectChips(plugin)" :key="chip.key">
              <router-link class="chip" :class="chip.key" :to="{ name: 'editPlugin', params: { pluginId: plugin._id }, query: { section: chip.section } }">{{ chip.label }}</router-link>
            </li>
          </ul>
          <p v-else class="idle">{{ $t('Does nothing yet') }} — <router-link :to="{ name: 'editPlugin', params: { pluginId: plugin._id } }">{{ $t('add a page, endpoint or event') }}</router-link></p>

          <p v-if="pageLinks(plugin).length" class="pages">
            <el-icon aria-hidden="true"><View /></el-icon>
            <template v-for="(page, i) in pageLinks(plugin).slice(0, MAX_PAGE_LINKS)" :key="page.href">
              <router-link :to="page.href" dir="auto">{{ page.name }}</router-link><span v-if="i < Math.min(pageLinks(plugin).length, MAX_PAGE_LINKS) - 1" aria-hidden="true">·</span>
            </template>
            <span v-if="pageLinks(plugin).length > MAX_PAGE_LINKS" class="more">+{{ pageLinks(plugin).length - MAX_PAGE_LINKS }}</span>
          </p>
        </div>

        <div class="actions">
          <el-button class="edit" :icon="Edit" @click="open(plugin)">{{ $t('Edit') }}</el-button>
          <el-dropdown trigger="click" @command="(c: string) => c === 'remove' && remove(plugin)">
            <el-button text circle :aria-label="`${$t('Actions')}: ${plugin.name}`"><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="remove" :icon="Delete">{{ $t('Remove plugin') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--el-border-color);
  }
}

.skeleton {
  min-block-size: 76px;
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
}

.name {
  align-self: flex-start;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-decoration: none;

  &:hover {
    color: var(--el-color-primary);
  }
}

.description,
.idle,
.pages {
  margin: 0;
  padding: 0;
  text-align: start;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.idle a {
  color: var(--el-color-primary);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 0.8rem;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  a {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.empty-hint {
  max-inline-size: 42ch;
  margin: 0 0 12px;
  padding: 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

@media (max-width: 640px) {
  .row {
    padding: 14px;
  }

  .edit {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row,
  .chip {
    transition: none;
  }
}
</style>
