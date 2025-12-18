<template>
  <div class="workspaces-list">

    <el-empty v-if="filteredWorkspaces.length === 0 && !store.loading" :description="$t('No workspaces found')" />
    
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

    <div v-else class="workspaces-list__grid">
      <el-card 
        v-for="workspace in filteredWorkspaces" 
        :key="workspace._id"
        class="workspace-card"
        :class="{ 'workspace-card--active': isActiveWorkspace(workspace) }"
        shadow="hover"
      >
        <template #header>
          <div class="workspace-card__header">
            <h3 class="workspace-card__title">
              <router-link :to="{name: 'editMyWorkspace', params: {id: workspace._id}}">
                {{ workspace.name }}
              </router-link>
            </h3>
            <el-tag v-if="isActiveWorkspace(workspace)" type="success" size="small">
              {{ $t('Current') }}
            </el-tag>
          </div>
        </template>
        
        <div class="workspace-card__content">
          <div class="workspace-card__info">
            <div class="workspace-card__info-item">
              <el-icon><font-awesome-icon :icon="['fas', 'users']" /></el-icon>
              <span>{{ workspace.members?.length || 0 }} {{ $t('Users') }}</span>
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="workspace-card__actions">
            <el-button 
              v-if="!isActiveWorkspace(workspace)" 
              type="primary" 
              @click="store.activate(workspace)"
              :loading="activatingWorkspace === workspace._id"
            >
              {{ $t('Switch to workspace') }}
            </el-button>
            <el-dropdown trigger="click">
              <el-button circle>
                <el-icon><font-awesome-icon :icon="['fas', 'ellipsis-vertical']" /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="navigateToEdit(workspace)">
                    <el-icon><font-awesome-icon :icon="['fas', 'edit']" /></el-icon>
                    {{ $t('Edit') }}
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="workspace.isPrivilegedUser" 
                    @click="store.remove(workspace._id)"
                    divided
                    type="danger"
                  >
                    <el-icon><font-awesome-icon :icon="['fas', 'trash']" /></el-icon>
                    {{ $t('Remove') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-card>
    </div>

    <div class="workspaces-list__pagination" v-if="filteredWorkspaces.length > 0">
      <el-button text @click="store.reload" :loading="store.loading">
        <el-icon><font-awesome-icon :icon="['fas', 'sync']" /></el-icon>
        {{ $t('Refresh') }}
      </el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import { authStore } from '@/modules/core/store/auth';
const { t } = useI18n();
const router = useRouter();
const store = useWorkspacesList();
const searchQuery = ref('');
const activatingWorkspace = ref('');

onMounted(() => {
  if (!store.workspaces.length) {
    store.reload();
  }
});

const filteredWorkspaces = computed(() => {
  if (!searchQuery.value) return store.workspaces;
  
  const query = searchQuery.value.toLowerCase();
  return store.workspaces.filter(workspace => 
    workspace.name.toLowerCase().includes(query)
  );
});

const isActiveWorkspace = (workspace) => {
  return authStore.user?.workspace?._id === workspace._id;
};

const navigateToEdit = (workspace) => {
  router.push({ name: 'editMyWorkspace', params: { id: workspace._id } });
};

// Override the activate method to track which workspace is being activated
const originalActivate = store.activate;
store.activate = async (workspace) => {
  try {
    activatingWorkspace.value = workspace._id;
    await originalActivate(workspace);
  } catch (error) {
    ElMessage.error(t('Failed to switch workspace'));
  } finally {
    activatingWorkspace.value = '';
  }
};
</script>

<style scoped>
.workspaces-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 0 1.5rem;
}

.workspaces-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.workspaces-list__search {
  max-width: 300px;
}

.workspaces-list__grid {
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

.workspace-card--active {
  border: 1px solid var(--el-color-success);
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
}

.workspaces-list__pagination {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}
</style>
