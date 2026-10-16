<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Delete, Edit, MoreFilled, Plus, WarningFilled } from '@element-plus/icons-vue';
import { IBlueprint } from '@qelos/global-types';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import sdk from '@/services/sdk';
import BlueprintsRelationGraph from './BlueprintsRelationGraph.vue';
import { describeProperty, propertyRows } from '../services/blueprint-editor';
import { filterBlueprints } from '../services/blueprints-list';

const props = defineProps({
  q: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const store = useBlueprintsStore();
const route = useRoute();
const router = useRouter();

const removeWithConfirm = useConfirmAction(store.remove);
const removeAllEntities = useConfirmAction((identifier: string) => sdk.blueprints.entitiesOf(identifier).remove('all', { query: { bypassAdmin: '' } }));

const currentView = computed<'list' | 'graph'>(() => (route.query.view as 'list' | 'graph') || 'list');
const filteredBlueprints = computed(() => filterBlueprints(store.blueprints, props.q));

const MAX_PROPERTY_CHIPS = 6;
const chips = (blueprint: IBlueprint) => {
  const rows = propertyRows(blueprint.properties);
  return { shown: rows.slice(0, MAX_PROPERTY_CHIPS), more: Math.max(0, rows.length - MAX_PROPERTY_CHIPS) };
};
const nameOf = (identifier: string) => store.blueprints.find((item) => item.identifier === identifier)?.name || identifier;
const openEditor = (blueprint: IBlueprint, section?: string) =>
  router.push({ name: 'editBlueprint', params: { blueprintIdentifier: blueprint.identifier }, query: section ? { section } : undefined });

function command(blueprint: IBlueprint, name: string) {
  if (name === 'remove') removeWithConfirm(blueprint.identifier);
  if (name === 'clear') removeAllEntities(blueprint.identifier);
}
</script>

<template>
  <div class="blueprints">
    <template v-if="currentView === 'list'">
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

      <div v-else-if="!filteredBlueprints.length" class="empty">
        <el-empty :description="q ? $t('No blueprint matches your search') : $t('No blueprints yet')">
          <p v-if="!q" class="empty-hint" dir="auto">{{ $t('A blueprint is a data model: the fields of the things your app keeps, like customers or orders. Describe your app and AI drafts them, or start from scratch.') }}</p>
          <el-button v-if="!q" type="primary" :icon="Plus" @click="router.push({ query: { mode: 'create' } })">{{ $t('New blueprint') }}</el-button>
        </el-empty>
      </div>

      <ul v-else class="list">
        <li v-for="blueprint in filteredBlueprints" :id="'blueprint-' + blueprint.identifier" :key="blueprint.identifier" class="row">
          <div class="main">
            <div class="title">
              <router-link class="name" dir="auto" :to="{ name: 'editBlueprint', params: { blueprintIdentifier: blueprint.identifier } }">{{ blueprint.name }}</router-link>
              <code dir="ltr">{{ blueprint.identifier }}</code>
            </div>
            <p v-if="blueprint.description" class="description" dir="auto">{{ blueprint.description }}</p>

            <ul v-if="chips(blueprint).shown.length" class="chips" :aria-label="$t('Properties')">
              <li v-for="row in chips(blueprint).shown" :key="row.key">
                <router-link class="chip" :to="{ name: 'editBlueprint', params: { blueprintIdentifier: blueprint.identifier }, query: { section: 'properties' } }" dir="auto">
                  {{ row.title || row.key }}<small>{{ $t(describeProperty(row).typeLabel) }}</small>
                </router-link>
              </li>
              <li v-if="chips(blueprint).more" class="more">+{{ chips(blueprint).more }}</li>
            </ul>
            <p v-else class="idle">{{ $t('No properties yet') }} — <router-link :to="{ name: 'editBlueprint', params: { blueprintIdentifier: blueprint.identifier }, query: { section: 'properties' } }">{{ $t('add the first one') }}</router-link></p>

            <p v-if="blueprint.relations?.length" class="links">
              <span>{{ $t('Links to') }}</span>
              <template v-for="(relation, i) in blueprint.relations" :key="relation.key">
                <router-link :to="{ name: 'editBlueprint', params: { blueprintIdentifier: relation.target } }" dir="auto">{{ nameOf(relation.target) }}</router-link><span v-if="i < blueprint.relations.length - 1" aria-hidden="true">·</span>
              </template>
            </p>
          </div>

          <div class="actions">
            <el-button class="edit" :icon="Edit" @click="openEditor(blueprint)">{{ $t('Edit') }}</el-button>
            <el-dropdown trigger="click" @command="(name: string) => command(blueprint, name)">
              <el-button text circle :aria-label="`${$t('Actions')}: ${blueprint.name}`"><el-icon><MoreFilled /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="clear" :icon="WarningFilled">{{ $t('Delete all its entities…') }}</el-dropdown-item>
                  <el-dropdown-item command="remove" :icon="Delete" divided>{{ $t('Remove blueprint') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </li>
      </ul>
    </template>

    <!-- Graph View -->
    <div v-else class="graph-view">
      <BlueprintsRelationGraph :blueprints="filteredBlueprints" />
    </div>
    
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

.title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;

  code {
    color: var(--el-text-color-secondary);
    font-size: 0.8rem;
  }
}

.name {
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
.links {
  margin: 0;
  padding: 0;
  text-align: start;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.idle a,
.links a {
  color: var(--el-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
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
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 0.8rem;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;

  small {
    color: var(--el-text-color-secondary);
    font-size: 0.72rem;
  }

  &:hover {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.more {
  padding: 2px 6px;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.empty-hint {
  max-inline-size: 46ch;
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
