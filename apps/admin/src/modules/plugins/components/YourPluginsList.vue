<template>
  <div class="plugins-container">
    <el-skeleton :loading="store.loading" :count="3" animated>
      <template #template>
        <div class="plugins-grid">
          <div class="plugin-skeleton" v-for="i in 3" :key="i">
            <el-skeleton-item variant="h3" style="width: 40%" />
            <el-skeleton-item variant="text" style="width: 60%" />
            <el-skeleton-item variant="text" style="width: 50%" />
          </div>
        </div>
      </template>
      
      <template #default>
        <div v-if="store.plugins.length === 0" class="empty-state">
          <el-empty :description="$t('No plugins found')">
            <el-button type="primary" @click="$router.push({ name: 'createPlugin' })">
              <el-icon><icon-plus /></el-icon>
              {{ $t('Add Plugin') }}
            </el-button>
          </el-empty>
        </div>
        
        <div v-else class="plugins-grid">
          <div v-for="plugin in store.plugins" 
               :key="plugin._id"
               :id="'plugin-' + plugin._id"
               class="plugin-card"
               @click="$router.push({name: 'editPlugin', params: {pluginId: plugin._id}})">
            
            <div class="plugin-header">
              <div class="plugin-title">
                <h3>
                  <router-link :to="{name: 'editPlugin', params: {pluginId: plugin._id}}" @click.stop>
                    {{ plugin.name }}
                  </router-link>
                </h3>
                <div class="plugin-badge" :class="getMicroFrontendsBadgeClass(plugin)">
                  {{ plugin.microFrontends ? plugin.microFrontends.length : 0 }} {{ $t('Micro-Frontends') }}
                </div>
              </div>
              <div class="plugin-description">
                {{ plugin.description || $t('No description provided') }}
              </div>
            </div>
            
            <div class="plugin-details" v-if="plugin.microFrontends && plugin.microFrontends.length > 0">
              <h4>{{ $t('Micro-Frontends') }}</h4>
              <div class="details-list">
                <div v-for="(mf, index) in plugin.microFrontends" :key="index" class="detail-item">
                  <div class="detail-name">
                    {{ mf.name }}
                    <span v-if="mf.guest" class="guest-badge">{{ $t('Guest') }}</span>
                  </div>
                  <div class="detail-actions" v-if="mf.route">
                    <el-button size="small" type="primary" @click.stop="$router.push('/' + mf.route.path)" circle>
                      <el-icon><icon-view /></el-icon>
                    </el-button>
                    <el-button size="small" type="warning" v-if="mf.guest" @click.stop="$router.push('screen-editor/' + mf.route.path)" circle>
                      <el-icon><icon-edit /></el-icon>
                    </el-button>
                  </div>
                  <div class="detail-type" v-else>
                    <el-tag size="small" type="info" effect="plain">
                      {{ $t('No Route') }}
                    </el-tag>
                  </div>
                </div>
                
                <div v-if="plugin.microFrontends.length === 0" class="no-details">
                  {{ $t('No micro-frontends defined') }}
                </div>
              </div>
            </div>
            
            <div class="plugin-details" v-if="plugin.subscribedEvents && plugin.subscribedEvents.length > 0">
              <h4>{{ $t('Subscribed Events') }}</h4>
              <div class="details-list">
                <div v-for="(event, index) in plugin.subscribedEvents" :key="index" class="detail-item">
                  <div class="detail-name">
                    {{ event.eventName || '*' }}
                  </div>
                  <div class="detail-type">
                    <el-tag size="small" type="info" effect="plain">
                      {{ event.source || '*' }}
                    </el-tag>
                    <el-tag size="small" type="success" effect="plain" v-if="event.kind">
                      {{ event.kind }}
                    </el-tag>
                  </div>
                </div>
                
                <div v-if="plugin.subscribedEvents.length === 0" class="no-details">
                  {{ $t('No events subscribed') }}
                </div>
              </div>
            </div>
            
            <div class="plugin-actions">
              <el-tooltip :content="$t('Edit Plugin')" placement="top">
                <el-button 
                  type="primary" 
                  circle 
                  @click.stop="$router.push({name: 'editPlugin', params: {pluginId: plugin._id}})"
                >
                  <el-icon><icon-edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip :content="$t('Remove Plugin')" placement="top">
                <el-button 
                  type="danger" 
                  circle 
                  @click.stop="remove(plugin)"
                >
                  <el-icon><icon-delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          
          <div class="plugin-card add-plugin-card" @click="$router.push({ name: 'createPlugin' })">
            <el-icon class="add-icon"><icon-plus /></el-icon>
            <h3>{{ $t('Create new Plugin') }}</h3>
            <p>{{ $t('Add a new plugin to your collection') }}</p>
          </div>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { IPlugin } from '@/services/types/plugin';

const router = useRouter();
const store = usePluginsList();

const remove = useConfirmAction(store.removePlugin);

// Get badge class based on number of micro-frontends
const getMicroFrontendsBadgeClass = (plugin: IPlugin) => {
  const count = plugin.microFrontends?.length || 0;
  if (count === 0) return 'empty';
  if (count < 3) return 'small';
  if (count < 6) return 'medium';
  return 'large';
};
</script>

<style scoped>
.plugins-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
}

.plugin-skeleton {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  height: 300px;
}

.empty-state {
  margin: 40px 0;
}

.plugin-card {
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

.plugin-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.plugin-header {
  margin-bottom: 16px;
}

.plugin-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.plugin-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.plugin-title a {
  color: inherit;
  text-decoration: none;
}

.plugin-title a:hover {
  text-decoration: underline;
}

.plugin-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.plugin-badge.empty {
  background-color: #f5f7fa;
  color: #909399;
}

.plugin-badge.small {
  background-color: #ecf5ff;
  color: #409eff;
}

.plugin-badge.medium {
  background-color: #f0f9eb;
  color: #67c23a;
}

.plugin-badge.large {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.plugin-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-details {
  flex: 1;
  margin-bottom: 16px;
}

.plugin-details h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  background-color: #f5f7fa;
  transition: background-color 0.2s;
}

.detail-item:hover {
  background-color: #ecf5ff;
}

.detail-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: #303133;
}

.guest-badge {
  color: #e6a23c;
  font-size: 12px;
  background-color: #fdf6ec;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.detail-type, .detail-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-actions .el-button {
  padding: 4px;
  font-size: 12px;
}

.no-details {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.plugin-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.add-plugin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 2px dashed var(--el-color-primary-light-5);
  background-color: rgba(64, 158, 255, 0.05);
}

.add-plugin-card:hover {
  background-color: rgba(64, 158, 255, 0.1);
  border-color: var(--el-color-primary);
}

.add-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.add-plugin-card h3 {
  margin: 0 0 8px 0;
  color: var(--el-color-primary);
}

.add-plugin-card p {
  margin: 0;
  color: #606266;
}

@media (max-width: 768px) {
  .plugins-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .plugins-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
