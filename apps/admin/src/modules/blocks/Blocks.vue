<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CopyDocument, Delete, Grid, List, Plus, Search } from '@element-plus/icons-vue';
import BlockThumbnail from './components/BlockThumbnail.vue';
import { useBlocksList } from './store/blocks-list';
import { useConfirmAction } from '../core/compositions/confirm-action';
import { contentBoxEmbed, htmlToText, matchesQuery } from './services/library';
import { formatRelative } from '@/modules/admins/services/event-presentation';

const { t, locale } = useI18n();
const router = useRouter();
const store = useBlocksList();

const query = ref('');
const VIEW_KEY = 'qelos:content-boxes-view';
const view = ref<'grid' | 'list'>('grid');
try {
  if (localStorage.getItem(VIEW_KEY) === 'list') view.value = 'list';
} catch {
  // the view preference is a convenience only
}
watch(view, (value) => {
  try {
    localStorage.setItem(VIEW_KEY, value);
  } catch {
    // ignore
  }
});

const blocks = computed(() => store.blocks || []);
const filtered = computed(() => blocks.value.filter((block) => matchesQuery(query.value, block.name, block.description, htmlToText(block.content, 400))));
const remove = useConfirmAction(store.removeBlock);

const summary = (block: any) => block.description || htmlToText(block.content) || t('No content yet');
const created = (block: any) => (block.updated || block.created ? formatRelative(block.updated || block.created, new Date(), locale.value || undefined) : '');
const edit = (block: any) => router.push({ name: 'editBlock', params: { blockId: block._id } });

async function copyEmbed(block: any) {
  try {
    await navigator.clipboard.writeText(contentBoxEmbed(block._id));
    ElMessage.success(t('Embed tag copied'));
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}
</script>

<template>
  <div class="blocks-page">
    <header class="page-head">
      <div>
        <h1>{{ $t('Content Boxes') }}</h1>
        <p>{{ $t('Reusable pieces of content you can drop into any page.') }}</p>
      </div>
      <el-button type="primary" @click="router.push({ name: 'createBlock' })">
        <el-icon><Plus /></el-icon>
        <span class="action-label">{{ $t('New box') }}</span>
      </el-button>
    </header>

    <div v-if="blocks.length" class="toolbar">
      <el-input v-model="query" class="search" clearable :prefix-icon="Search" :placeholder="$t('Search content boxes')" :aria-label="$t('Search content boxes')" />
      <el-segmented
        v-model="view"
        :options="[
          { label: $t('Grid'), value: 'grid' },
          { label: $t('List'), value: 'list' },
        ]"
        :aria-label="$t('View')"
      />
    </div>

    <el-skeleton v-if="store.loading && !blocks.length" :rows="5" animated />

    <el-empty v-else-if="!blocks.length" :description="$t('No content boxes yet')">
      <p class="empty-hint">{{ $t('A content box is a block of rich content, like a banner, a FAQ or a footer note, that you write once and embed anywhere.') }}</p>
      <el-button type="primary" @click="router.push({ name: 'createBlock' })">{{ $t('Create your first content box') }}</el-button>
    </el-empty>

    <el-empty v-else-if="!filtered.length" :image-size="80" :description="$t('No content boxes match your search')" />

    <ul v-else class="boxes" :class="view">
      <li v-for="block in filtered" :key="block._id" class="box">
        <router-link class="thumb-link" :to="{ name: 'editBlock', params: { blockId: block._id } }" tabindex="-1" aria-hidden="true">
          <BlockThumbnail :content="block.content" />
        </router-link>
        <div class="box-body">
          <router-link class="box-name" :to="{ name: 'editBlock', params: { blockId: block._id } }" dir="auto">{{ block.name }}</router-link>
          <p class="box-summary" dir="auto">{{ summary(block) }}</p>
          <p v-if="created(block)" class="box-meta">{{ created(block) }}</p>
        </div>
        <div class="box-actions">
          <el-button size="small" @click="copyEmbed(block)">
            <el-icon><CopyDocument /></el-icon>
            <span>{{ $t('Copy embed') }}</span>
          </el-button>
          <el-button size="small" @click="edit(block)">{{ $t('Edit') }}</el-button>
          <el-button size="small" text circle type="danger" :aria-label="`${$t('Remove')}: ${block.name}`" @click="remove(block)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.blocks-page {
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
    line-height: 1.2;
  }

  p {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.action-label {
  margin-inline-start: 6px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.search {
  flex: 1 1 260px;
  max-inline-size: 420px;
}

.empty-hint {
  max-inline-size: 420px;
  margin: 0 auto 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.boxes {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  &.grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  &.list {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
}

.box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }
}

.list .box {
  flex-direction: row;
  align-items: center;
}

.list .thumb-link {
  flex: none;
  inline-size: 160px;
}

.thumb-link {
  display: block;
}

.box-body {
  flex: 1;
  min-inline-size: 0;
}

.box-name {
  display: block;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.box-summary {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.box-meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.box-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list .box-actions {
  flex: none;
}

@media (max-width: 768px) {
  .blocks-page {
    padding: 12px;
  }

  .action-label {
    display: none;
  }

  .list .box {
    flex-direction: column;
    align-items: stretch;
  }

  .list .thumb-link {
    inline-size: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .box {
    transition: none;
  }
}
</style>
