<template>
  <div class="blueprints-container">
  
    <!-- List View -->
    <div v-if="currentView === 'list'" class="blueprints-grid">
      <div v-for="blueprint in filteredBlueprints"
           :key="blueprint.identifier"
           :id="'blueprint-' + blueprint.identifier"
           @mouseenter="markRelationships(blueprint)"
           @mouseleave="unmarkRelationships"
           :class="{'blueprint-card': true, 'marked': isMarked(blueprint)}"
           @click="navigateToBlueprint(blueprint.identifier, $event)"
      >
        <div class="blueprint-header">
          <div class="blueprint-title">
            <h3>
              <router-link :to="{name: 'editBlueprint', params: {blueprintIdentifier: blueprint.identifier}}" @click.stop>
                {{ blueprint.name }}
              </router-link>
            </h3>
            <div class="blueprint-badge" :class="getBadgeClass(blueprint)">
              {{ getPropertiesCount(blueprint) }} {{ $t('Properties') }}
            </div>
          </div>
          <div class="blueprint-description">
            {{ blueprint.description || $t('No description provided') }}
          </div>
        </div>
        
        <div class="blueprint-properties">
          <h4>{{ $t('Properties') }}</h4>
          <div class="properties-list">
            <div v-for="(field, key) in blueprint.properties" 
                 :key="key"
                 class="property-item"
            >
              <div class="property-name">
                {{ field.title }}
                <span v-if="field.required" class="required-badge">*</span>
                <InfoIcon v-if="field.description" :content="field.description" class="info-icon"/>
              </div>
              <div class="property-type">
                <el-tag size="small" :type="getTypeTagType(field.type)">
                  {{ field.multi ? ($t('List of') + ' ') : '' }}{{ capitalize(field?.type?.toString() || 'string') }}
                </el-tag>
                <span v-if="field.min || field.max" class="property-constraints">
                  {{ getMinMax(field.min, field.max) }}
                </span>
              </div>
            </div>
            <div v-if="Object.keys(blueprint.properties || {}).length === 0" class="no-properties">
              {{ $t('No properties defined') }}
            </div>
          </div>
        </div>
        
        <div class="blueprint-actions">
          <el-tooltip :content="$t('Edit Blueprint')" placement="top">
            <el-button 
              type="primary" 
              circle 
              @click.stop="$router.push({name: 'editBlueprint', params: {blueprintIdentifier: blueprint.identifier}})"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip :content="$t('Remove Blueprint')" placement="top">
            <el-button 
              type="danger" 
              circle 
              @click.stop="removeWithConfirm(blueprint.identifier)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip :content="$t('Remove All Entities')" placement="top">
            <el-button 
              type="warning" 
              circle 
              @click.stop="removeAllEntities(blueprint.identifier)"
            >
              <el-icon><RemoveFilled /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <AddNewCard 
        :title="$t('Create new Blueprint')"
        :description="$t('Add a new blueprint to your collection')"
        :to="{ name: 'createBlueprint' }"
      />
    </div>
    
    <!-- Graph View -->
    <div v-else-if="currentView === 'graph'" class="graph-view">
      <BlueprintsRelationGraph 
        :blueprints="filteredBlueprints" 
        @select="handleBlueprintSelect"
      />
    </div>
    
    <EmptyState v-else
                icon="blueprint"
                :title="props.q ? 'No Matching Blueprints' : 'No Blueprints Found'"
                :description="props.q ? `No blueprints match your search '${props.q}'` : 'Create your first blueprint to start using the No-Code module'">
      <el-button type="primary" @click="$router.push({ name: 'createBlueprint' })">{{ $t('Create new Blueprint') }}</el-button>
    </EmptyState>
  </div>
</template>
<script lang="ts" setup>
import { capitalize, computed } from 'vue';
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import { useRoute, useRouter } from 'vue-router';
import { IBlueprint } from '@qelos/global-types'
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import sdk from '@/services/sdk';

import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import BlueprintsRelationGraph from './BlueprintsRelationGraph.vue';
import { Edit, Delete, RemoveFilled } from '@element-plus/icons-vue';

const props = defineProps({
  q: {
    type: String,
    default: ''
  }
})

const store = useBlueprintsStore()
const removeWithConfirm = useConfirmAction(store.remove)

const removeAllEntities = useConfirmAction((identifier: string) => sdk.blueprints.entitiesOf(identifier).remove('all', {query: {bypassAdmin: ''}}))

const route = useRoute();
const router = useRouter();

// Get current view from route query or default to list
const currentView = computed<'list' | 'graph'>(() => {
  return (route.query.view as 'list' | 'graph') || 'list';
});

// Filter blueprints based on search query
const filteredBlueprints = computed(() => {
  if (!props.q) return store.blueprints;
  
  const searchTerm = props.q.toLowerCase().trim();
  return store.blueprints.filter(blueprint => 
    blueprint.name.toLowerCase().includes(searchTerm) || 
    blueprint.identifier.toLowerCase().includes(searchTerm) || 
    (blueprint.description && blueprint.description.toLowerCase().includes(searchTerm)) ||
    Object.entries(blueprint.properties || {}).some(([key, prop]) => 
      key.toLowerCase().includes(searchTerm) || 
      (prop.title && prop.title.toLowerCase().includes(searchTerm)) ||
      (prop.description && prop.description.toLowerCase().includes(searchTerm))
    )
  );
});

function markRelationships(blueprint: IBlueprint) {
  // Using a mutable object for temporary state
  const marked = blueprint.relations.map(r => r.target).reduce((acc, target) => {
    acc[target] = true;
    return acc;
  }, {});
  
  // Update DOM directly since we're not using reactive state
  store.blueprints.forEach(bp => {
    const element = document.getElementById('blueprint-' + bp.identifier);
    if (element) {
      if (marked[bp.identifier]) {
        element.classList.add('marked');
      } else {
        element.classList.remove('marked');
      }
    }
  });
}

function unmarkRelationships() {
  // Remove marked class from all blueprint elements
  store.blueprints.forEach(bp => {
    const element = document.getElementById('blueprint-' + bp.identifier);
    if (element) {
      element.classList.remove('marked');
    }
  });
}

function isMarked(blueprint: IBlueprint) {
  // This is now handled directly in the DOM via markRelationships and unmarkRelationships
  return false;
}

function getPropertiesCount(blueprint: IBlueprint) {
  return Object.keys(blueprint.properties || {}).length;
}

function getBadgeClass(blueprint: IBlueprint) {
  const count = getPropertiesCount(blueprint);
  if (count === 0) return 'empty';
  if (count < 3) return 'small';
  if (count < 6) return 'medium';
  return 'large';
}

function getTypeTagType(type: string | undefined): '' | 'success' | 'warning' | 'info' | 'danger' {
  switch(type?.toString().toLowerCase()) {
    case 'string': return '';
    case 'number': return 'success';
    case 'boolean': return 'warning';
    case 'date': return 'danger';
    case 'object': return 'info';
    default: return '';
  }
}

function navigateToBlueprint(identifier: string, event: MouseEvent) {
  // Only navigate if the click wasn't on a child element that has its own click handler
  if (event.target === event.currentTarget || (event.target as HTMLElement).closest('.blueprint-card') === event.currentTarget) {
    router.push({name: 'editBlueprint', params: {blueprintIdentifier: identifier}});
  }
}

function handleBlueprintSelect(blueprint: IBlueprint | null) {
  if (blueprint) {
    store.selectItem(blueprint.identifier);
  }
}

function getMinMax(min, max) {
  if (min && max) {
    return `(${min} - ${max})`;
  } else if (min) {
    return `(${min} and above)`;
  } else if (max) {
    return `(up to ${max})`;
  }
}
</script>
<style scoped>
.blueprints-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.view-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.blueprints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
}

.graph-view {
  height: 700px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.blueprint-card {
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

.blueprint-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.blueprint-header {
  margin-bottom: 16px;
}

.blueprint-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.blueprint-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.blueprint-title a {
  color: inherit;
  text-decoration: none;
}

.blueprint-title a:hover {
  text-decoration: underline;
}

.blueprint-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.blueprint-badge.empty {
  background-color: #f5f7fa;
  color: #909399;
}

.blueprint-badge.small {
  background-color: #ecf5ff;
  color: #409eff;
}

.blueprint-badge.medium {
  background-color: #f0f9eb;
  color: #67c23a;
}

.blueprint-badge.large {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.blueprint-description {
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

.blueprint-properties {
  flex: 1;
  margin-bottom: 16px;
}

.blueprint-properties h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

.property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  background-color: #f5f7fa;
  transition: background-color 0.2s;
}

.property-item:hover {
  background-color: #ecf5ff;
}

.property-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: #303133;
}

.required-badge {
  color: #f56c6c;
  font-weight: bold;
  margin-inline-start: 2px;
}

.info-icon {
  margin-inline-start: 4px;
}

.property-type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.property-constraints {
  font-size: 12px;
  color: #909399;
}

.no-properties {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.blueprint-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-block-start: 12px;
  border-block-start: 1px solid #ebeef5;
}

.marked {
  background-color: rgba(250, 246, 212, 0.8);
  border-color: #e6a23c;
}

@media (max-width: 768px) {
  .blueprints-grid {
    grid-template-columns: 1fr;
  }
  
  .graph-view {
    height: 500px;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .blueprints-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
