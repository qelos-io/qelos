<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CopyDocument, Delete, Plus, Search } from '@element-plus/icons-vue';
import { useComponentsList } from './store/components-list';
import { useConfirmAction } from '../core/compositions/confirm-action';
import { componentUsageTag, matchesQuery } from './services/library';
import { formatRelative } from '@/modules/admins/services/event-presentation';

const { t, locale } = useI18n();
const router = useRouter();
const store = useComponentsList();

const query = ref('');
const components = computed(() => store.components || []);
const filtered = computed(() => components.value.filter((c: any) => matchesQuery(query.value, c.componentName, c.identifier, c.description)));
const remove = useConfirmAction(store.removeComponent);

const updated = (c: any) => (c.updated ? formatRelative(c.updated, new Date(), locale.value || undefined) : '');
const edit = (c: any) => router.push({ name: 'editComponent', params: { componentId: c._id } });

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(message);
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}
</script>

<template>
  <div class="components-page">
    <header class="page-head">
      <div>
        <h1>{{ $t('Components') }}</h1>
        <p>{{ $t('Reusable Vue components you can use across your pages and templates.') }}</p>
      </div>
      <el-button type="primary" @click="router.push({ name: 'createComponent' })">
        <el-icon><Plus /></el-icon>
        <span class="action-label">{{ $t('New component') }}</span>
      </el-button>
    </header>

    <div v-if="components.length" class="toolbar">
      <el-input v-model="query" class="search" clearable :prefix-icon="Search" :placeholder="$t('Search components')" :aria-label="$t('Search components')" />
    </div>

    <el-skeleton v-if="store.loading && !components.length" :rows="5" animated />

    <el-empty v-else-if="!components.length" :description="$t('No components yet')">
      <p class="empty-hint">{{ $t('A component is a piece of UI written in Vue. Create it once, then use it anywhere with its tag.') }}</p>
      <el-button type="primary" @click="router.push({ name: 'createComponent' })">{{ $t('Create your first component') }}</el-button>
    </el-empty>

    <el-empty v-else-if="!filtered.length" :image-size="80" :description="$t('No components match your search')" />

    <ul v-else class="rows">
      <li v-for="c in filtered" :key="c._id" class="row">
        <div class="main">
          <router-link class="name" :to="{ name: 'editComponent', params: { componentId: c._id } }" dir="auto">{{ c.componentName }}</router-link>
          <p class="desc" dir="auto">{{ c.description || $t('No description') }}</p>
        </div>
        <button type="button" class="chip" dir="ltr" :title="$t('Copy usage tag')" :aria-label="`${$t('Copy usage tag')}: ${componentUsageTag(c.componentName)}`" @click="copy(componentUsageTag(c.componentName), $t('Usage tag copied'))">
          <code>{{ componentUsageTag(c.componentName) }}</code>
          <el-icon><CopyDocument /></el-icon>
        </button>
        <span class="meta">{{ updated(c) }}</span>
        <div class="actions">
          <el-button size="small" @click="edit(c)">{{ $t('Edit') }}</el-button>
          <el-button size="small" text circle type="danger" :aria-label="`${$t('Remove')}: ${c.componentName}`" @click="remove(c)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.components-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 0;
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--el-text-color-secondary);
  }
}

.search {
  max-inline-size: 360px;
}

.empty-hint {
  max-inline-size: 420px;
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.rows {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 110px auto;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;

  & + & {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-decoration: none;

  &:hover {
    color: var(--el-color-primary);
  }
}

.desc {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  cursor: pointer;

  code {
    font-size: 12px;
  }

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }
}

.meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .components-page {
    padding: 12px;
  }

  .action-label {
    display: none;
  }

  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
  }

  .main {
    grid-column: 1 / -1;
  }

  .meta {
    grid-column: 1;
  }

  .chip {
    grid-column: 1;
    justify-self: start;
  }

  .actions {
    grid-column: 2;
    grid-row: 2 / span 2;
  }
}
</style>
