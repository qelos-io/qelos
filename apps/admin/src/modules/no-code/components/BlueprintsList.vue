<template>
  <div class="list">
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
        <small>{{ blueprint.description }}</small>
      </template>
      <div class="metadata">
        <table>
          <tr v-for="(field, key) in blueprint.properties" :key="key">
            <td>
              {{ field.title }}<span v-if="field.required" class="danger">*</span>
              <InfoIcon v-if="field.description" :content="field.description"/>
            </td>
            <td>
              {{ field.multi ? ($t('List of') + ' ') : '' }}{{ capitalize(field.type) }}
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
  <EmptyState v-if="store.loaded && !store.blueprints?.length"
              description="Create your first blueprint to start using the No-Code module">
    <el-button type="primary" @click="$router.push({ name: 'createBlueprint' })">{{ $t('Create new Integration') }}</el-button>
  </EmptyState>
</template>
<script lang="ts" setup>
import { capitalize, ref } from 'vue';
import { IBlueprint } from '@qelos/global-types'
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import sdk from '@/services/sdk';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';

const store = useBlueprintsStore()
const removeWithConfirm = useConfirmAction(store.remove)

const removeAllEntities = useConfirmAction((identifier: string) => sdk.blueprints.entitiesOf(identifier).remove('all'))

const markedRelationships = ref<Record<string, boolean>>({})

function markRelationships(blueprint: IBlueprint) {
  markedRelationships.value = blueprint.relations.map(r => r.target).reduce((acc, target) => {
    acc[target] = true;
    return acc;
  }, {});
}

function unmarkRelationships() {
  markedRelationships.value = {}
}

function isMarked(blueprint: IBlueprint) {
  return markedRelationships.value[blueprint.identifier];
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
.list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
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
}

table {
  border-collapse: collapse;

  td {
    padding: 3px;
  }
}
</style>
