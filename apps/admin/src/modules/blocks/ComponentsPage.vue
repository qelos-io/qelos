<template>
  <div class="components-page">
    <ListPageTitle
      title="Components" 
      description="Components are reusable Vue elements that can be used across your application. Create and manage custom components here."
      :create-route-name="'createComponent'"
    />
    
    <el-card class="components-list-card">
      <el-table
        v-loading="componentsStore.loading"
        :data="componentsStore.components"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="componentName" label="Name" min-width="150">
          <template #default="{ row }">
            <div class="component-name">
              <el-icon><component :is="'Document'" /></el-icon>
              <span>{{ row.componentName }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="identifier" label="Identifier" min-width="150" />
        
        <el-table-column prop="description" label="Description" min-width="250">
          <template #default="{ row }">
            <span class="description-text">{{ row.description || 'No description' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="updated" label="Last Updated" min-width="150">
          <template #default="{ row }">
            <span>{{ displayDate(row.updated) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column fixed="right" label="Actions" width="120">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click.stop="handleEdit(row)"
            >
              Edit
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click.stop="removeComponent(row)"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div v-if="!componentsStore.loading && componentsStore.components.length === 0" class="empty-state">
        <el-empty description="No components found">
          <el-button type="primary" @click="createComponent">Create Component</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue';
import { useComponentsList } from './store/components-list';
import { INoCodeComponent } from '@qelos/global-types';
import { useConfirmAction } from '../core/compositions/confirm-action';

const router = useRouter();

const componentsStore = useComponentsList();

const removeComponent = useConfirmAction(componentsStore.removeComponent);

const handleRowClick = (row: INoCodeComponent) => {
  router.push({ name: 'editComponent', params: { componentId: row._id } });
};

const handleEdit = (row: INoCodeComponent) => {
  router.push({ name: 'editComponent', params: { componentId: row._id } });
};

const createComponent = () => {
  router.push({ name: 'createComponent' });
};

function displayDate(date: string) {
  return new Date(date).toLocaleString();
}
</script>

<style scoped>
.components-page {
  padding: 20px;
}

.components-list-card {
  margin-block-start: 20px;
}

.component-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.description-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
