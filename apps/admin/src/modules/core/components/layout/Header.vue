<template>
  <header v-if="loaded && showStandardHeader" :dir="$t('appDirection')" :class="{ searching: isSearching, header: true, compact: isCompact, 'stacked-header': isStackedHeader }">
    <div class="header-left">
      <el-button v-if="showMenuButton" class="menu-opener" text circle size="large" :aria-label="isNavigationOpened ? $t('Close menu') : $t('Open menu')" :aria-expanded="isNavigationOpened" @click="toggle">
        <el-icon><font-awesome-icon :icon="['fas', isNavigationOpened ? 'xmark' : 'bars']" /></el-icon>
      </el-button>

      <router-link v-if="(isStackedHeader && !(isCompact && current)) || (isCompact && !showPageSearch && !current)" to="/" class="logo-container" :aria-label="appConfig.name">
        <img v-if="appConfig.logoUrl" :src="appConfig.logoUrl" :alt="appConfig.name" class="logo" />
        <span v-else class="app-title">{{ appConfig.name }}</span>
      </router-link>

      <div v-if="current && !showPageSearch" class="where" :class="{ 'with-logo': isStackedHeader }">
        <template v-if="!isCompact && current.section">
          <span class="where-section">{{ current.section }}</span>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="where-sep" aria-hidden="true" />
        </template>
        <span class="where-page">{{ current.label }}</span>
      </div>
    </div>

    <div v-if="showPageSearch" class="header-center">
      <div class="search-container" :class="{ active: isSearching }">
        <el-input
          class="query-input"
          size="large"
          v-model="query"
          clearable
          :aria-label="$t(route?.meta?.searchPlaceholder as string || 'Search...')"
          :placeholder="$t(route?.meta?.searchPlaceholder as string || 'Search...')"
          @focus="isSearching = true"
          @blur="isSearching = false"
        >
          <template #prefix>
            <el-icon class="search-icon"><font-awesome-icon :icon="['fas', 'search']" /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <div class="header-right">
      <button type="button" class="palette-trigger" :aria-label="$t('Go to…')" :title="$t('Go to…')" @click="openPalette">
        <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
        <span class="palette-label">{{ $t('Go to…') }}</span>
        <kbd class="palette-key">⌘K</kbd>
      </button>
      <AssistantOpener v-if="isPrivilegedUser" />
      <HeaderUserDropdown />
    </div>
  </header>
  <RuntimeTemplate v-if="loaded && usersHeader?.active" class="header" :template="usersHeader.html" :template-props="templateProps" :components="{ HeaderUserDropdown }" />
</template>
<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import debounce from 'lodash.debounce';
import { useRoute, useRouter } from 'vue-router';
import HeaderUserDropdown from '@/modules/core/components/layout/HeaderUserDropdown.vue';
import RuntimeTemplate from '@/modules/core/components/layout/RuntimeTemplate.vue';
import { useUsersHeader } from '@/modules/configurations/store/users-header';
import { isPrivilegedUser } from '@/modules/core/store/auth';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import AssistantOpener from '@/modules/admins/components/AssistantOpener.vue';
import { useNavSections, findCurrent } from '../../compositions/navigation';
import { useViewport } from '../../compositions/viewport';
import { openPalette } from '../../store/shell';

const { appConfig } = useAppConfiguration()

const { usersHeader, loaded } = useUsersHeader()

const isStackedHeader = computed(() => appConfig.value.layoutStyle === 'stacked-header');
const showStandardHeader = computed(() => isPrivilegedUser.value || !usersHeader.value?.active)

const props = defineProps({
  isNavigationOpened: {
    type: Boolean,
    default: false
  },
  // the shell tells the header whether the navigation component offers its own way to open the menu
  showMenuButton: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle']);
const router = useRouter()
const route = useRoute()

const { isCompact } = useViewport()
const sections = useNavSections()
const current = computed(() => findCurrent(sections.value, route.path))
const showPageSearch = computed(() => !!route.meta?.searchQuery)

const tempQuery = ref(null)
const isSearching = ref(false)

// Notifications feature will be implemented later

const query = computed({
  get: () => typeof tempQuery.value === 'string' ? tempQuery.value : route.query.q?.toString(),
  set: (value: string) => {
    tempQuery.value = value;
  }
});

const templateProps = computed(() => {
  return {
    query
  };
});

// Keyboard shortcut for search
const handleKeyDown = (e: KeyboardEvent) => {
  // Focus search on '/' key press if not already in an input
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    const searchInput = document.querySelector('.query-input input');
    if (searchInput) {
      (searchInput as HTMLElement).focus();
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

watch(tempQuery, debounce((value: string) => {
  if (value === null) {
    return;
  }
  router.push({ query: { ...route.query, q: value } })
  tempQuery.value = null
}, 500))

const toggle = () => emit('toggle');
</script>
<style scoped lang="scss">
header {
  position: sticky;
  inset-block-start: 0;
  z-index: 90;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  block-size: var(--header-height, 60px);
  margin: var(--spacing) var(--spacing) 0;
  padding-inline: 16px 12px;
  border: var(--layout-header-border, 0);
  border-radius: var(--border-radius);
  background: var(--layout-header-bg, var(--surface, #fff));
  box-shadow: var(--layout-header-shadow, none);

  &:not(.compact):not(.stacked-header) {
    max-inline-size: var(--layout-header-max-width, none);
  }
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-inline-size: 0;
}

.header-left {
  flex: 1 1 0;
}

.header-right {
  flex: none;
  justify-content: flex-end;
}

.header-center {
  display: flex;
  flex: 2 1 0;
  justify-content: center;
  min-inline-size: 0;
}

.menu-opener {
  flex: none;
  inline-size: 44px;
  block-size: 44px;
  margin-inline-start: -8px;
}

.logo-container {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--el-text-color-primary);
  text-decoration: none;
}

.logo {
  block-size: 30px;
  inline-size: auto;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.where {
  display: flex;
  align-items: center;
  gap: 8px;
  min-inline-size: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.95rem;

  &.with-logo {
    margin-inline-start: 12px;
    padding-inline-start: 16px;
    border-inline-start: 1px solid var(--border-color);
  }
}

.where-section,
.where-page {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.where-page {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.where-sep {
  flex: none;
  font-size: 0.65rem;
  opacity: 0.6;
}

[dir='rtl'] .where-sep {
  transform: scaleX(-1);
}

.search-container {
  inline-size: 100%;
  max-inline-size: 520px;
}

.query-input :deep(.el-input__wrapper) {
  border-radius: calc(var(--border-radius, 6px) + 2px);
}

.search-icon {
  color: var(--el-text-color-secondary);
}

.palette-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  block-size: 38px;
  padding: 0 12px;
  border: 1px solid var(--el-border-color);
  border-radius: calc(var(--border-radius, 6px) + 2px);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-secondary);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-text-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  .palette-label {
    min-inline-size: 90px;
    text-align: start;
  }

  .palette-key {
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--el-fill-color);
    font: inherit;
    font-size: 0.72rem;
  }
}

@media (max-width: 1023px) {
  header {
    margin-inline: 0;
    margin-block-start: 0;
    border-radius: 0;
    border-inline: 0;
    border-block-start: 0;
  }

  .palette-trigger {
    inline-size: 40px;
    block-size: 40px;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;

    .palette-label,
    .palette-key {
      display: none;
    }
  }
}

@media (max-width: 639px) {
  header {
    padding-inline: 12px 8px;
    gap: 6px;
  }

  .header-center {
    flex: 1 1 auto;
  }

  .header-right {
    gap: 2px;
  }
}
</style>
