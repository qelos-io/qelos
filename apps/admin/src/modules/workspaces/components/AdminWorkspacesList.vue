<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import useAdminWorkspacesList from '../store/admin-workspaces-list';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Edit, Delete } from '@element-plus/icons-vue';

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

const navigateToEdit = (workspaceId) => {
  router.push({ name: 'adminEditWorkspace', params: { id: workspaceId } });
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

const confirmRemove = (workspaceId, workspaceName) => {
  if (confirm(t('Are you sure you want to remove workspace {0}?', [workspaceName]))) {
    store.remove(workspaceId).catch(() => {
      ElMessage.error(t('Failed to remove workspace'));
    });
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
      <el-card 
        v-for="workspace in filteredWorkspaces" 
        :key="workspace._id"
        class="workspace-card"
        shadow="hover"
      >
        <template #header>
          <div class="workspace-card__header">
            <h3 class="workspace-card__title">
              <router-link :to="{ name: 'adminEditWorkspace', params: { id: workspace._id } }">
                {{ workspace.name }}
              </router-link>
            </h3>
          </div>
        </template>
        
        <div class="workspace-card__content">
          <!-- Labels -->
          <div v-if="workspace.labels && workspace.labels.length" class="workspace-card__labels">
            <el-tag 
              v-for="label in workspace.labels" 
              :key="label" 
              size="small"
              class="workspace-label"
            >
              {{ label }}
            </el-tag>
          </div>
          
          <!-- Metadata -->
          <div class="workspace-card__info">
            <div class="workspace-card__info-item" v-if="workspace.createdAt">
              <el-icon><i class="el-icon-time"></i></el-icon>
              <span>{{ $t('Created') }}: {{ formatDate(workspace.createdAt) }}</span>
            </div>
            <div class="workspace-card__info-item">
              <el-icon><i class="el-icon-user"></i></el-icon>
              <span>{{ workspace.members?.length || 0 }} {{ $t('Users') }}</span>
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="workspace-card__actions">
            <router-link :to="{ name: 'adminEditWorkspace', params: { id: workspace._id } }">
              <el-button class="edit-button" type="primary">
                <el-icon><Edit /></el-icon>
                {{ $t('Edit') }}
              </el-button>
            </router-link>
            <el-button class="remove-button" type="danger" @click="confirmRemove(workspace._id, workspace.name)">
              <el-icon><Delete /></el-icon>
              {{ $t('Remove') }}
            </el-button>
          </div>
        </template>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.admin-workspaces-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 0 1rem;
}

.admin-workspaces-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.admin-workspaces-list__search {
  max-width: 300px;
}

.admin-workspaces-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.workspace-card {
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.workspace-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workspace-card__title {
  margin: 0;
  font-size: 1.1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__content {
  flex: 1;
}

.workspace-card__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.workspace-label {
  margin-right: 5px;
}

.workspace-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.workspace-card__info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.workspace-card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.edit-button {
  background-color: var(--el-color-primary);
  color: white;
  border: none;
  font-size: 12px;
  padding: 8px 12px;
}

.edit-button:hover {
  background-color: var(--el-color-primary-light-3);
  color: white;
}

.remove-button {
  background-color: var(--el-color-danger);
  color: white;
  border: none;
  font-size: 12px;
  padding: 8px 12px;
}

.remove-button:hover {
  background-color: var(--el-color-danger-light-3);
  color: white;
}
</style>