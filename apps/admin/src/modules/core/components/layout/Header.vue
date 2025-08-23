<template>
  <header v-if="loaded && showStandardHeader" :dir="$t('appDirection')" :class="{ 'searching': isSearching, header: true }">
    <div class="header-left">
      <el-button class="mobile-menu-opener" v-if="$isMobile" text circle size="large" @click="toggle">
        <el-icon>
          <font-awesome-icon :icon="['fas', isNavigationOpened ? 'times' : 'bars']"/>
        </el-icon>
      </el-button>
      
      <div class="logo-container" v-if="$isMobile">
        <img v-if="appConfig.logoUrl" :src="appConfig.logoUrl" :alt="appConfig.name" class="logo" />
        <h2 v-else class="app-title">{{ appConfig.name }}</h2>
      </div>
    </div>
    
    <div class="header-center" v-if="route.meta?.searchQuery">
      <div class="search-container" :class="{ 'active': isSearching }">
        <el-input
          class="query-input"
          size="large"
          v-model="query"
          :placeholder="$t(route?.meta?.searchPlaceholder as string || 'Search...')"
          @focus="isSearching = true"
          @blur="isSearching = false"
        >
          <template #prefix>
            <el-icon class="search-icon">
              <font-awesome-icon :icon="['fas', 'search']"/>
            </el-icon>
          </template>
          <template #suffix v-if="query">
            <el-icon class="clear-icon" @click="query = ''">
              <font-awesome-icon :icon="['fas', 'times']"/>
            </el-icon>
          </template>
        </el-input>
        <div class="search-shortcuts" v-if="isSearching">
          <span class="shortcut-hint">Press <kbd>/</kbd> to focus</span>
          <span class="shortcut-hint">Press <kbd>Esc</kbd> to cancel</span>
        </div>
      </div>
    </div>
    
    <div class="header-right">
      <AssistantOpener v-if="isPrivilegedUser"/>
      <HeaderUserDropdown/>
    </div>
  </header>
  <RuntimeTemplate v-if="loaded && usersHeader?.active" class="header"
                    :template="usersHeader.html"
                    :template-props="templateProps" :components="{HeaderUserDropdown}"/>
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

const { appConfig } = useAppConfiguration()

const { usersHeader, loaded } = useUsersHeader()

const showStandardHeader = computed(() => isPrivilegedUser.value || !usersHeader.value?.active)

const props = defineProps({
  isNavigationOpened: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle']);
const router = useRouter()
const route = useRoute()

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
  margin: var(--spacing);
  border-radius: var(--border-radius);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  height: 60px;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 0 16px;
  transition: all 0.3s ease;
  
  &.searching {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.header-left, .header-right, .header-center {
  display: flex;
  align-items: center;
}

.header-left {
  min-width: 200px;
}

.header-center {
  flex: 1;
  justify-content: center;
}

.header-right {
  min-width: 200px;
  justify-content: flex-end;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-inline-start: 10px;
}

.logo {
  height: 32px;
  width: auto;
}

.app-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.search-container {
  width: 100%;
  max-width: 500px;
  position: relative;
  transition: all 0.3s ease;
  
  &.active {
    max-width: 600px;
  }
}

.query-input {
  width: 100%;
  transition: all 0.3s ease;
  
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    padding-left: 12px;
    transition: all 0.3s ease;
    
    &.is-focus {
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--primary-color);
    }
  }
  
  :deep(.el-input__inner) {
    font-size: 14px;
  }
}

.search-icon, .clear-icon {
  color: var(--text-color-light);
  font-size: 14px;
}

.clear-icon {
  cursor: pointer;
  
  &:hover {
    color: var(--text-color);
  }
}

.search-shortcuts {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-color-light);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.shortcut-hint {
  display: flex;
  align-items: center;
  gap: 4px;
}

kbd {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  color: #333;
  display: inline-block;
  font-size: 11px;
  line-height: 1;
  padding: 2px 4px;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-end: 16px;
}

.action-button {
  font-size: 18px;
  color: var(--text-color-light);
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--primary-color);
  }
}

.mobile-menu-opener {
  display: none;
  margin-inline-end: 10px;
}

/* Notifications styles will be added when the feature is implemented */

@media (max-width: 900px) {
  .header-center {
    max-width: 300px;
  }
}

@media (max-width: 768px) {
  header {
    padding: 0 12px;
  }
  
  .header-left {
    min-width: auto;
  }
  
  .header-right {
    min-width: auto;
  }
  
  .logo-container {
    display: none;
  }
}

@media (max-width: 600px) {
  header {
    margin-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    height: 55px;
    order: 2;
    z-index: 80;
  }
  
  .mobile-menu-opener {
    display: block;
  }
  
  .header-center {
    max-width: 200px;
  }
  
  .search-shortcuts {
    display: none;
  }
  
  .logo-container {
    margin-inline-start: 5px;
  }
  
  .app-title {
    font-size: 1rem;
  }

  .logo {
    height: 28px;
  }
}

@media (max-width: 480px) {
  .header-actions {
    margin-inline-end: 8px;
  }
  
  .action-button {
    font-size: 16px;
  }
}
</style>
