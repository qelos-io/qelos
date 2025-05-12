<template>
  <div class="blueprints-container">
    <div class="view-toggle">
      <el-radio-group :model-value="currentView" @update:model-value="changeView" size="large">
        <el-radio-button value="list">
          <el-icon><List /></el-icon>
          {{ $t('List View') }}
        </el-radio-button>
        <el-radio-button value="graph">
          <el-icon><Connection /></el-icon>
          {{ $t('Relations Graph') }}
        </el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- List View -->
    <div v-if="currentView === 'list'" class="list">
      <BlockItem v-for="blueprint in store.blueprints"
                :key="blueprint.identifier"
                :id="'blueprint-' + blueprint.identifier"
                @mouseenter="markRelationships(blueprint)"
                @mouseleave="unmarkRelationships"
                :class="{'blueprint-item': true, marked: isMarked(blueprint)}"
      >
        <template v-slot:title>
          <router-link :to="{name: 'editBlueprint', params: {blueprintIdentifier: blueprint.identifier}}">
            {{ blueprint.name }}
          </router-link>
        </template>
        <div class="metadata">
          <p><small>{{ blueprint.description }}</small></p>
          <table>
            <tr v-for="(field, key) in blueprint.properties" :key="key">
              <td>
                {{ field.title }}<span v-if="field.required" class="danger">*</span>
                <InfoIcon v-if="field.description" :content="field.description"/>
              </td>
              <td>
                {{ field.multi ? ($t('List of') + ' ') : '' }}{{ capitalize(field?.type?.toString() || 'string') }}
                <span v-if="field.min || field.max">{{ getMinMax(field.min, field.max) }}</span>
              </td>
            </tr>
          </table>
        </div>
        <template v-slot:actions>
          <RemoveButton wide @click="removeWithConfirm(blueprint.identifier)"/>
          <el-button wide text type="danger" @click="removeAllEntities(blueprint.identifier)">
            {{ $t('Remove All Entities') }}
          </el-button>
        </template>
      </BlockItem>
    </div>
    
    <!-- Graph View -->
    <div v-else-if="currentView === 'graph'" class="graph-view">
      <BlueprintsRelationGraph 
        :blueprints="store.blueprints" 
        @select="handleBlueprintSelect"
      />
    </div>
    
    <EmptyState v-if="store.loaded && !store.blueprints?.length"
                description="Create your first blueprint to start using the No-Code module">
      <el-button type="primary" @click="$router.push({ name: 'createBlueprint' })">{{ $t('Create new Blueprint') }}</el-button>
    </EmptyState>
  </div>
</template>
<script lang="ts" setup>
import { capitalize, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IBlueprint } from '@qelos/global-types'
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import sdk from '@/services/sdk';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import BlueprintsRelationGraph from './BlueprintsRelationGraph.vue';
import { List, Connection } from '@element-plus/icons-vue';

const store = useBlueprintsStore()
const removeWithConfirm = useConfirmAction(store.remove)

const removeAllEntities = useConfirmAction((identifier: string) => sdk.blueprints.entitiesOf(identifier).remove('all'))

const route = useRoute();
const router = useRouter();
const markedRelationships = computed(() => ({}));

// Get current view from route query or default to list
const currentView = computed<'list' | 'graph'>(() => {
  return (route.query.view as 'list' | 'graph') || 'list';
});

// Change view by updating route query
function changeView(view: 'list' | 'graph') {
  router.push({
    query: { ...route.query, view }
  });
}

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

.list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.graph-view {
  height: 700px;
  border-radius: 8px;
  overflow: hidden;
}

.blueprint-item {
  flex: 1;
  max-width: 600px;
  min-width: calc(50% - 40px);
}

.marked {
  background-color: rgba(250, 246, 212, 0.54);
}

@media (max-width: 480px) {
  .list {
    flex-direction: column;
  }

  .blueprint-item {
    min-width: auto;
    max-width: none;
  }
  
  .graph-view {
    height: 500px;
  }
}

table {
  border-collapse: collapse;

  td {
    padding: 3px;
  }
}
</style>
