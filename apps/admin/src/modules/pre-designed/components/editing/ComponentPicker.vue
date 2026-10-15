<script setup lang="ts">
import { capitalize } from 'vue';
import { Search, Star, StarFilled } from '@element-plus/icons-vue';
import { useComponentCatalog } from '../../compositions/component-catalog';

defineEmits<{ (e: 'pick', key: string): void }>();

const { query, category, categories, displayed, isFavorite, toggleFavorite } = useComponentCatalog();
</script>

<template>
  <div class="picker">
    <el-input v-model="query" :prefix-icon="Search" clearable :placeholder="$t('Search components')" :aria-label="$t('Search components')" />
    <div class="chips" role="tablist" :aria-label="$t('Categories')">
      <button v-for="option in categories" :key="option" type="button" role="tab" :aria-selected="category === option" class="chip" :class="{ on: category === option }" @click="category = option">
        {{ option === 'all' ? $t('All') : capitalize(option) }}
      </button>
    </div>

    <p v-if="!displayed.length" class="empty">{{ $t('No components match your search.') }}</p>
    <ul v-else class="list">
      <li v-for="entry in displayed" :key="entry.key">
        <button type="button" class="item" @click="$emit('pick', entry.key)">
          <span class="text">
            <span class="title">{{ entry.descriptor.title || entry.key }}</span>
            <span class="description" dir="auto">{{ entry.descriptor.description || $t('No description provided yet.') }}</span>
          </span>
          <span class="category">{{ entry.descriptor.category ? capitalize(entry.descriptor.category) : $t('Custom') }}</span>
        </button>
        <el-button text circle :icon="isFavorite(entry.key) ? StarFilled : Star" :aria-label="isFavorite(entry.key) ? $t('Remove from favorites') : $t('Add to favorites')" :class="{ fav: isFavorite(entry.key) }" @click="toggleFavorite(entry.key)" />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chips {
  display: flex;
  gap: 6px;
  padding-block-end: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.85rem;
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

.empty {
  margin: 8px 0;
  padding: 0;
  color: var(--el-text-color-secondary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

.item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-inline-size: 0;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.title {
  font-weight: 600;
}

.description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

.fav {
  color: var(--el-color-warning);
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
  }
}
</style>
