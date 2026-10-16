<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import BlueprintCreateDrawer from '@/modules/no-code/components/BlueprintCreateDrawer.vue';

const route = useRoute();
const router = useRouter();
const store = useBlueprintsStore();

const view = computed<'list' | 'graph'>(() => (route.query.view === 'graph' ? 'graph' : 'list'));
const total = computed(() => store.blueprints?.length || 0);
const links = computed(() => (store.blueprints || []).reduce((sum, blueprint) => sum + (blueprint.relations?.length || 0), 0));

const setView = (next: 'list' | 'graph') => router.replace({ query: { ...route.query, view: next === 'graph' ? 'graph' : undefined } });
const openCreate = () => router.push({ query: { ...route.query, mode: 'create' } });
const closeCreate = () => router.replace({ query: { ...route.query, mode: undefined } });
</script>

<template>
  <div class="blueprints-page">
    <header class="head">
      <div>
        <h1>{{ $t('Blueprints') }}</h1>
        <p v-if="store.loaded" class="count" dir="auto">
          {{ total === 1 ? $t('1 blueprint') : $t('{count} blueprints', { count: total }) }}<template v-if="links"> · {{ links === 1 ? $t('1 link') : $t('{count} links', { count: links }) }}</template>
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">{{ $t('New blueprint') }}</el-button>
    </header>

    <div class="views" role="group" :aria-label="$t('View')">
      <button type="button" class="chip" :class="{ on: view === 'list' }" :aria-pressed="view === 'list'" @click="setView('list')">{{ $t('List') }}</button>
      <button type="button" class="chip" :class="{ on: view === 'graph' }" :aria-pressed="view === 'graph'" @click="setView('graph')">{{ $t('Relations') }}</button>
    </div>

    <BlueprintsList :q="route.query.q as string" />
    <BlueprintCreateDrawer :visible="route.query.mode === 'create'" @close="closeCreate" />
  </div>
</template>

<style scoped lang="scss">
.blueprints-page {
  padding: 8px 20px 24px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 14px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    line-height: 1.25;
  }

  .count {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.views {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-end: 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 640px) {
  .blueprints-page {
    padding-inline: 12px;
  }
}
</style>
