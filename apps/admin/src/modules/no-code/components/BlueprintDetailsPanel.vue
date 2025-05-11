<template>
  <div v-if="blueprint" class="blueprint-details">
    <h3>{{ blueprint.name }}</h3>
    <p>{{ blueprint.description }}</p>
    
    <h4>{{ $t('Properties') }}</h4>
    <div v-if="Object.keys(blueprint.properties).length" class="properties-list">
      <div v-for="(property, key) in blueprint.properties" :key="key" class="property-item">
        <div class="property-header">
          <strong>{{ property.title }}</strong>
          <el-tag size="small" class="property-type">{{ property.type }}</el-tag>
          <el-tag v-if="property.required" size="small" type="danger" class="property-required">{{ $t('Required') }}</el-tag>
        </div>
        <div class="property-description">{{ property.description }}</div>
        <div v-if="property.enum" class="property-enum">
          <span class="property-enum-label">{{ $t('Options') }}:</span>
          <el-tag 
            v-for="option in property.enum" 
            :key="option" 
            size="small" 
            class="property-enum-option"
          >
            {{ option }}
          </el-tag>
        </div>
        <div v-if="property.min !== undefined || property.max !== undefined" class="property-range">
          <span v-if="property.min !== undefined">{{ $t('Min') }}: {{ property.min }}</span>
          <span v-if="property.max !== undefined">{{ $t('Max') }}: {{ property.max }}</span>
        </div>
        <div v-if="property.multi" class="property-multi">
          <el-tag size="small" type="info">{{ $t('Multiple values') }}</el-tag>
        </div>
      </div>
    </div>
    <div v-else class="no-properties">{{ $t('No properties defined') }}</div>
    
    <h4>{{ $t('Relations') }}</h4>
    <div v-if="blueprint.relations.length">
      <div v-for="relation in blueprint.relations" :key="relation.key" class="relation-item">
        <strong>{{ relation.key }}</strong> → 
        <el-tag 
          @click="$emit('select-by-identifier', relation.target)"
          class="relation-target"
        >
          {{ getBlueprintName(relation.target) }}
        </el-tag>
      </div>
    </div>
    <div v-else class="no-relations">{{ $t('No relations defined') }}</div>
    
    <h4>{{ $t('Incoming Relations') }}</h4>
    <div v-if="incomingRelations.length">
      <div v-for="relation in incomingRelations" :key="relation.blueprint.identifier + relation.key" class="relation-item">
        <el-tag 
          @click="$emit('select', relation.blueprint)"
          class="relation-source"
        >
          {{ relation.blueprint.name }}
        </el-tag>
        → <strong>{{ relation.key }}</strong>
      </div>
    </div>
    <div v-else class="no-relations">{{ $t('No incoming relations') }}</div>
    
    <div class="actions">
      <el-button type="primary" @click="$router.push({name: 'editBlueprint', params: {blueprintIdentifier: blueprint.identifier}})">{{ $t('Edit Blueprint') }}</el-button>
      <el-button @click="$emit('close')">{{ $t('Close') }}</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { IBlueprint } from '@qelos/global-types';

const props = defineProps<{
  blueprint: IBlueprint | null;
  blueprints: IBlueprint[];
}>();

const emit = defineEmits<{
  (e: 'select', blueprint: IBlueprint): void;
  (e: 'select-by-identifier', identifier: string): void;
  (e: 'close'): void;
}>();

// Calculate incoming relations for the selected blueprint
const incomingRelations = computed(() => {
  if (!props.blueprint) return [];
  
  return props.blueprints
    .filter(bp => bp.relations.some(rel => rel.target === props.blueprint?.identifier))
    .flatMap(blueprint => {
      return blueprint.relations
        .filter(rel => rel.target === props.blueprint?.identifier)
        .map(rel => ({
          blueprint,
          key: rel.key
        }));
    });
});

// Get blueprint name by identifier
function getBlueprintName(identifier: string): string {
  const blueprint = props.blueprints.find(bp => bp.identifier === identifier);
  return blueprint?.name || identifier;
}
</script>

<style scoped>
.blueprint-details {
  width: 300px;
  padding: 20px;
  border-left: 1px solid #e0e0e0;
  background-color: white;
  overflow-y: auto;
}

.property-item {
  margin-bottom: 16px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #f8f8f8;
}

.property-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 5px;
}

.property-type,
.property-required,
.property-multi {
  margin-left: 5px;
}

.property-description {
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.property-enum,
.property-range {
  margin-top: 5px;
  font-size: 12px;
}

.property-enum-label {
  margin-right: 5px;
  font-weight: bold;
}

.property-enum-option {
  margin-right: 5px;
  margin-bottom: 5px;
}

.property-range {
  display: flex;
  gap: 15px;
}

.relation-item {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.relation-target,
.relation-source {
  cursor: pointer;
}

.no-relations,
.no-properties {
  color: #909399;
  font-style: italic;
  margin-bottom: 15px;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .blueprint-details {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e0e0e0;
  }
}
</style>
