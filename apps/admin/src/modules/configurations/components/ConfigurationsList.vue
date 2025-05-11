<template>
  <div class="configurations-list">
    <!-- Search and filter bar -->
    <div class="search-bar">
      <el-select v-model="filterType" placeholder="Filter by type" @change="handleSearch" clearable>
        <el-option label="All" value=""></el-option>
        <el-option label="Public" value="public"></el-option>
        <el-option label="Private" value="private"></el-option>
      </el-select>
    </div>
    
    <!-- Loading state -->
    <div v-if="!list" class="loading-state">
      <el-skeleton :rows="3" animated />
      <el-skeleton :rows="3" animated />
    </div>
    
    <!-- Empty state -->
    <el-empty v-else-if="list && filteredList.length === 0" description="No configurations found">
      <template #image>
        <el-icon><DocumentRemove style="font-size: 48px" /></el-icon>
      </template>
      <el-button type="primary" @click="clearFilters">Clear filters</el-button>
    </el-empty>
    
    <!-- Configurations list -->
    <div v-else class="configurations-grid">
      <BlockItem 
        v-for="config in filteredList" 
        :key="config.key"
        class="config-item"
        :class="{'system-config': config.key === 'app-configuration'}"
      >
        <template v-slot:title>
          <div class="config-title">
            <el-tag 
              size="small" 
              :type="config.key === 'app-configuration' ? 'danger' : (config.public ? 'success' : 'info')"
              class="config-tag"
            >
              {{ config.key === 'app-configuration' ? 'System' : (config.public ? 'Public' : 'Private') }}
            </el-tag>
            <router-link :to="{name: 'editConfiguration', params: {key: config.key}}">
              {{ $t(config.key) }}
            </router-link>
          </div>
        </template>
        
        <div class="content">
          <p v-if="config.description" class="config-description">{{ config.description }}</p>
          <div class="config-meta">
            <span v-if="config.updatedAt" class="update-time">
              <el-icon><Calendar /></el-icon>
              Updated: {{ formatDate(config.updatedAt) }}
            </span>
          </div>
        </div>
        
        <template v-slot:actions>
          <div class="action-buttons">
            <el-tooltip content="Edit configuration" placement="top" :hide-after="1500">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                :icon="Edit"
                @click="navigateToEdit(config)"
              />
            </el-tooltip>
            
            <el-tooltip 
              v-if="config.key !== 'app-configuration'" 
              content="Delete configuration" 
              placement="top"
              :hide-after="1500"
            >
              <el-button 
                type="danger" 
                size="small" 
                circle 
                :icon="Delete"
                @click="remove(config)"
              />
            </el-tooltip>
          </div>
        </template>
      </BlockItem>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useConfigurationsList } from '../compositions/configurations';
import BlockItem from '../../core/components/layout/BlockItem.vue';
import configurationsService from '@/services/configurations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { Search, Calendar, Edit, Delete, DocumentRemove } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const searchQuery = ref('');
const filterType = ref('');

const { list, retry } = useConfigurationsList();

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Filter and search logic
const filteredList = computed(() => {
  if (!list.value) return [];
  
  return list.value.filter(config => {
    const matchesSearch = searchQuery.value === '' || 
      $t(config.key).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
      
    const matchesFilter = filterType.value === '' ||
      (filterType.value === 'public' && config.public) ||
      (filterType.value === 'private' && !config.public);
      
    return matchesSearch && matchesFilter;
  });
});

const handleSearch = () => {
  // This function is triggered on search/filter changes
  // We could add debounce here if needed
};

const clearFilters = () => {
  searchQuery.value = '';
  filterType.value = '';
};

const navigateToEdit = (config) => {
  router.push({ name: 'editConfiguration', params: { key: config.key } });
};

const { submit: removeFn } = useSubmitting((config) => configurationsService.remove(config.key), {
  success: 'Configuration removed successfully',
  error: 'Failed to remove configuration'
}, retry);

const remove = useConfirmAction(removeFn);

// No artificial loading delay - we want maximum performance
</script>

<style scoped>
.configurations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
}

.search-bar {
  display: flex;
  gap: var(--spacing);
  margin-bottom: var(--spacing);
}

.configurations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing);
}

.config-item {
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.config-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.system-config {
  border-left: 3px solid var(--el-color-danger);
}

.config-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-tag {
  flex-shrink: 0;
}

.content {
  padding: var(--spacing);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.config-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
}

.update-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.loading-state {
  padding: var(--spacing);
}
</style>