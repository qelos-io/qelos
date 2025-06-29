<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import useAdminWorkspacesList from '../store/admin-workspaces-list';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Edit, Delete } from '@element-plus/icons-vue';
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';

const { t } = useI18n();
const store = useAdminWorkspacesList();
const route = useRoute();
const router = useRouter();
const searchQuery = ref(route.query.q?.toString() || '');

const props = defineProps<{
  selectedLabels: string[];
}>();

onMounted(() => {
  if (!store.workspaces.length) {
    store.reload();
  }
});

const filteredWorkspaces = computed(() => {
  const query = searchQuery.value.toLowerCase();
  
  return store.workspaces.filter(workspace => {
    const matchesQuery = !query || workspace.name.toLowerCase().includes(query);
    const matchesLabels =
      props.selectedLabels.length === 0 || props.selectedLabels.every(label => workspace.labels.includes(label));

    return matchesQuery && matchesLabels;
  });
});

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

const confirmRemove = (workspaceId: string, workspaceName: string) => {
  if (confirm(t('Are you sure you want to remove workspace {0}?', [workspaceName]))) {
    store.remove(workspaceId);
  }
};

const navigateToWorkspace = (workspaceId: string, event: MouseEvent) => {
  if (event.target === event.currentTarget || (event.target as HTMLElement).closest('.workspace-card') === event.currentTarget) {
    router.push({name: 'adminEditWorkspace', params: {id: workspaceId}});
  }
};
</script>

<template>
  <div class="admin-workspaces-list">
    <!-- Empty state -->
    <el-empty 
      v-if="filteredWorkspaces.length === 0 && !store.loading" 
      :description="$t('No workspaces found')" 
    />
    
    <!-- Loading skeleton -->
    <el-skeleton :loading="store.loading" animated :count="3" v-if="store.loading">
      <template #template>
        <div style="padding: 14px">
          <el-skeleton-item variant="p" style="width: 50%" />
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px">
            <el-skeleton-item variant="text" style="margin-right: 16px" />
            <el-skeleton-item variant="text" style="width: 30%" />
          </div>
        </div>
      </template>
    </el-skeleton>

    <!-- Workspaces grid -->
    <div v-else class="admin-workspaces-list__grid">
      <div
        v-for="workspace in filteredWorkspaces" 
        :key="workspace._id"
        class="workspace-card"
        @click="navigateToWorkspace(workspace._id, $event)"
      >
        <div class="workspace-header">
          <div class="workspace-title">
            <h3>
              <router-link :to="{ name: 'adminEditWorkspace', params: { id: workspace._id } }" @click.stop>
                {{ workspace.name }}
              </router-link>
            </h3>
            <div v-if="workspace.labels && workspace.labels.length" class="workspace-badge">
              {{ workspace.labels.length }} {{ $t('Labels') }}
            </div>
          </div>
          <div class="workspace-description" v-if="workspace.description">
            {{ workspace.description || $t('No description provided') }}
          </div>
        </div>
        
        <div class="workspace-details">
          <h4>{{ $t('Labels') }}</h4>
          <div class="labels-list" v-if="workspace.labels && workspace.labels.length">
            <el-tag 
              v-for="label in workspace.labels" 
              :key="label" 
              size="small"
              class="workspace-label"
            >
              {{ label }}
            </el-tag>
          </div>
          <div v-else class="no-labels">
            {{ $t('No labels defined') }}
          </div>
          
          <!-- Metadata -->
          <div class="workspace-info" v-if="workspace.createdAt">
            <div class="workspace-info-item">
              <el-icon><i class="el-icon-time"></i></el-icon>
              <span>{{ $t('Created') }}: {{ formatDate(workspace.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="workspace-actions">
          <el-tooltip :content="$t('Edit Workspace')" placement="top">
            <el-button 
              type="primary" 
              circle 
              @click.stop="$router.push({name: 'adminEditWorkspace', params: {id: workspace._id}})"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip :content="$t('Remove Workspace')" placement="top">
            <el-button 
              type="danger" 
              circle 
              @click.stop="confirmRemove(workspace._id, workspace.name)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <AddNewCard 
        :title="$t('Create new Workspace')"
        :description="$t('Add a new workspace to your collection')"
        :to="{ name: 'adminCreateWorkspace' }"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-workspaces-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0 1rem;
}

.admin-workspaces-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.admin-workspaces-list__search {
  max-width: 300px;
}

.admin-workspaces-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
}

.workspace-card {
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

.workspace-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.workspace-header {
  margin-bottom: 16px;
}

.workspace-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.workspace-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.workspace-title a {
  color: inherit;
  text-decoration: none;
}

.workspace-title a:hover {
  text-decoration: underline;
}

.workspace-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  background-color: #ecf5ff;
  color: #409eff;
}

.workspace-description {
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

.workspace-details {
  flex: 1;
  margin-bottom: 16px;
}

.workspace-details h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.labels-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.workspace-label {
  margin-right: 0;
}

.no-labels {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 10px 0;
}

.workspace-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.workspace-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.workspace-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .admin-workspaces-list__grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .admin-workspaces-list__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>