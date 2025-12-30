<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { IIntegration, IIntegrationSource } from '@qelos/global-types';

interface Props {
  integration: IIntegration;
  sourcesById: Record<string, IIntegrationSource>;
}

const props = defineProps<Props>();
const router = useRouter();

const kinds = useIntegrationKinds();

const emit = defineEmits<{
  toggleActive: [integration: IIntegration];
  remove: [id: string];
  clone: [integration: IIntegration];
}>();

const handleCardClick = () => {
  // Navigate to edit mode
  router.push({ query: { mode: 'edit', id: props.integration._id } });
};

const handleEditClick = (event: MouseEvent) => {
  event.stopPropagation();
  router.push({ query: { mode: 'edit', id: props.integration._id } });
};

const handleToggleActive = (event: MouseEvent) => {
  event.stopPropagation();
  emit('toggleActive', props.integration);
};

const handleRemove = (event: MouseEvent) => {
  event.stopPropagation();
  emit('remove', props.integration._id);
};

const handleClone = (event: MouseEvent) => {
  event.stopPropagation();
  emit('clone', props.integration);
};
</script>

<template>
  <div class="integration-card"
       :class="{ 'integration-card-inactive': !integration.active }"
       @click="handleCardClick">
    
    <div class="integration-header">
      <div class="integration-title">
        <h3>
          <router-link :to="{query: { mode: 'edit', id: integration._id }}" @click.stop>
            {{ sourcesById[integration.trigger.source]?.name || 'Unknown' }} → {{ sourcesById[integration.target.source]?.name || 'Unknown' }}
          </router-link>
        </h3>
        <div class="integration-subtitle" v-if="integration.trigger.details?.name">
          {{ integration.trigger.details.name }}
        </div>
      </div>
      <p class="integration-description" v-if="integration.trigger.operation === 'webhook'">
        {{ integration.trigger.details?.kind }}<span v-if="integration.trigger.details?.eventName"> | Event: {{ integration.trigger.details.eventName }}</span>
      </p>
      <p class="integration-description" v-else-if="integration.trigger.details?.description">{{ integration.trigger.details.description }}</p>
    </div>

    <div class="integration-flow">
      <div class="integration-icon-container">
        <div class="integration-icon">
          <img v-if="kinds[integration.kind[0]]?.logo" 
               :src="kinds[integration.kind[0]]?.logo" 
               :alt="kinds[integration.kind[0]]?.name" 
               class="integration-logo">
          <p v-else class="large">{{ kinds[integration.kind[0]]?.name }}</p>
        </div>
        <div class="integration-details">
          <div class="integration-source-name">{{ sourcesById[integration.trigger.source]?.name || 'Unknown' }}</div>
          <div class="integration-operation">{{ integration.trigger.operation }}</div>
        </div>
      </div>
      
      <div class="integration-arrow">
        <el-icon><icon-arrow-right /></el-icon>
      </div>
      
      <div class="integration-icon-container">
        <div class="integration-icon">
          <img v-if="kinds[integration.kind[1]]?.logo" 
               :src="kinds[integration.kind[1]]?.logo" 
               :alt="kinds[integration.kind[1]]?.name" 
               class="integration-logo">
          <p v-else class="large">{{ kinds[integration.kind[1]]?.name }}</p>
        </div>
        <div class="integration-details">
          <div class="integration-source-name">{{ sourcesById[integration.target.source]?.name || 'Unknown' }}</div>
          <div class="integration-operation">{{ integration.target.operation }}</div>
        </div>
      </div>
    </div>
    
    <div class="integration-actions">
      <el-tooltip :content="$t('Toggle Active Status')" placement="top">
        <el-button 
          :type="integration.active ? 'success' : 'info'" 
          circle 
          @click="handleToggleActive"
        >
          <el-icon><icon-check v-if="integration.active" /><icon-close v-else /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip :content="$t('Edit Integration')" placement="top">
        <el-button 
          type="primary" 
          circle 
          @click="handleEditClick"
        >
          <el-icon><icon-edit /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip :content="$t('Clone Integration')" placement="top">
        <el-button 
          type="info" 
          circle 
          @click="handleClone"
        >
          <el-icon><icon-copy-document /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip :content="$t('Delete Integration')" placement="top">
        <el-button 
          type="danger" 
          circle 
          @click="handleRemove"
        >
          <el-icon><icon-delete /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.integration-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
}

.integration-card-inactive {
  opacity: 0.5;
}

.integration-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.integration-header {
  margin-bottom: 12px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 6px;
  padding: 10px 12px;
  position: relative;
  border-left: 4px solid var(--el-color-primary);
}

.integration-title {
  display: flex;
  flex-direction: column;
  margin-bottom: 6px;
}

.integration-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.integration-title a {
  color: inherit;
  text-decoration: none;
}

.integration-title a:hover {
  text-decoration: underline;
}

.integration-subtitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-color-primary-dark-2);
  margin-top: 3px;
}

.integration-description {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.integration-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0;
  flex: 1;
}

.integration-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.integration-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
}

.integration-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.integration-source-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.integration-operation {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.integration-icon img {
  max-width: 100%;
  max-height: 45px;
  border-radius: 6px;
  margin: 0;
  object-fit: contain;
}

.integration-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 20px;
}

.integration-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.large {
  font-size: 24px;
}
</style>
