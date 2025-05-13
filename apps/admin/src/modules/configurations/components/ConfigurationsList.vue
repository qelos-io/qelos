<template>
  <div class="configurations-list">    

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
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();  

// Accept filter type and search query from parent component
const props = defineProps({
  filterType: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  }
});

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
    const matchesSearch = props.searchQuery === '' || 
      t(config.key).toLowerCase().includes(props.searchQuery.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(props.searchQuery.toLowerCase()));
      
    const matchesFilter = props.filterType === '' ||
      (props.filterType === 'public' && config.public) ||
      (props.filterType === 'private' && !config.public);
      
    return matchesSearch && matchesFilter;
  });
});

const emit = defineEmits(['update:filterType', 'update:searchQuery']);

const clearFilters = () => {
  // Emit events to update parent's filterType and searchQuery
  emit('update:filterType', '');
  emit('update:searchQuery', '');
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