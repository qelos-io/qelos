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
      <div
        v-for="config in filteredList" 
        :key="config.key"
        class="config-card"
        :class="{'system-config': config.key === 'app-configuration'}"
        @click="navigateToEdit(config, $event)"
      >
        <div class="config-header">
          <div class="config-title">
            <h3>
              <router-link :to="{name: 'editConfiguration', params: {key: config.key}}" @click.stop>
                {{ $t(config.key) }}
              </router-link>
            </h3>
            <el-tag 
              size="small" 
              :type="config.key === 'app-configuration' ? 'danger' : (config.public ? 'success' : 'info')"
              class="config-tag"
            >
              {{ config.key === 'app-configuration' ? 'System' : (config.public ? 'Public' : 'Private') }}
            </el-tag>
          </div>
          <div class="config-description" v-if="config.description">
            {{ config.description }}
          </div>
        </div>
        
        <div class="config-details">
          <h4>{{ $t('Details') }}</h4>
          <div class="config-meta">
            <div v-if="config.updatedAt" class="update-time">
              <el-icon><Calendar /></el-icon>
              <span>{{ $t('Updated') }}: {{ formatDate(config.updatedAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="config-actions">
          <el-tooltip content="Edit configuration" placement="top">
            <el-button 
              type="primary" 
              circle 
              @click.stop="navigateToEdit(config)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip 
            v-if="config.key !== 'app-configuration'" 
            content="Delete configuration" 
            placement="top"
          >
            <el-button 
              type="danger" 
              circle 
              @click.stop="remove(config)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <AddNewCard 
        :title="$t('Create new Configuration')"
        :description="$t('Add a new configuration to your collection')"
        :to="{ name: 'createConfiguration' }"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useConfigurationsList } from '../compositions/configurations';
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import configurationsService from '@/services/apis/configurations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { Calendar, Edit, Delete, DocumentRemove } from '@element-plus/icons-vue';

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

const navigateToEdit = (config, event?: MouseEvent) => {
  if (!event || event.target === event.currentTarget || (event.target as HTMLElement).closest('.config-card') === event.currentTarget) {
    router.push({ name: 'editConfiguration', params: { key: config.key } });
  }
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
  gap: 20px;
  margin: 0 1rem;
}

.configurations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
}

.config-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
}

.config-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.system-config {
  border-left: 3px solid var(--el-color-danger);
}

.config-header {
  margin-bottom: 16px;
}

.config-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.config-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.config-title a {
  color: inherit;
  text-decoration: none;
}

.config-title a:hover {
  text-decoration: underline;
}

.config-tag {
  flex-shrink: 0;
}

.config-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-details {
  flex: 1;
  margin-bottom: 16px;
}

.config-details h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.config-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.update-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.loading-state {
  padding: 20px;
}

@media (max-width: 768px) {
  .configurations-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .configurations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>