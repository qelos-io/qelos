<script lang="ts" setup>
import { computed } from 'vue';
import { authStore } from '@/modules/core/store/auth';
import { flattenNav } from './services/navigation-model';
import { useNavSections } from './compositions/navigation';
import NavIcon from './components/layout/NavIcon.vue';

const sections = useNavSections();
const pages = computed(() => flattenNav(sections.value).filter((item) => item.to));
const name = computed(() => authStore.user?.firstName || '');
</script>

<template>
  <div class="welcome">
    <h1>{{ name ? $t('Welcome, {name}', { name }) : $t('Welcome!') }}</h1>

    <template v-if="pages.length">
      <p class="lead">{{ $t('Where would you like to go?') }}</p>
      <ul class="pages">
        <li v-for="page in pages" :key="page.key">
          <router-link :to="page.to!" class="page">
            <NavIcon :icon="page.icon" class="page-icon" />
            <span class="page-name">{{ page.label }}</span>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="go" aria-hidden="true" />
          </router-link>
        </li>
      </ul>
    </template>
    <el-empty v-else :image-size="120" :description="$t('Nothing here yet. Pages you have access to will show up here.')" />
  </div>
</template>

<style scoped lang="scss">
.welcome {
  max-inline-size: 720px;
  padding: 28px 24px 40px;

  h1 {
    margin: 0;
    font-size: 1.6rem;
  }
}

.lead {
  margin: 6px 0 20px;
  color: var(--el-text-color-secondary);
}

.pages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.page {
  display: flex;
  align-items: center;
  gap: 14px;
  min-block-size: 64px;
  padding: 0 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  color: var(--el-text-color-primary);
  text-decoration: none;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.page-icon {
  color: var(--el-color-primary);
  font-size: 1.2rem;
}

.page-name {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.go {
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

[dir='rtl'] .go {
  transform: scaleX(-1);
}

@media (max-width: 639px) {
  .welcome {
    padding: 20px 16px 32px;
  }

  .pages {
    grid-template-columns: 1fr;
  }
}
</style>
