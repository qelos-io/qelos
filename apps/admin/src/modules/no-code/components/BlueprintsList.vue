<template>
  <div class="list">
    <GpItem v-for="blueprint in store.blueprints"
            :key="blueprint.identifier"
            :id="'blueprint-' + blueprint.identifier"
            class="blueprint-item"
    >
      <template v-slot:title>
        <router-link :to="{name: 'editBlueprint', params: {blueprintIdentifier: blueprint.identifier}}">{{ blueprint.name }}</router-link>
        <small>{{ blueprint.description }}</small>
      </template>
      <div class="metadata">
        <table>
          <tr v-for="(field, key) in blueprint.properties" :key="key">
            <td>
              {{ field.title }}
              <InfoIcon v-if="field.description" :content="field.description"/>
            </td>
            <td>{{ field.type }}</td>
          </tr>
        </table>
      </div>
      <template v-slot:actions>
        <RemoveButton wide @click="removeWithConfirm(blueprint.identifier)"/>
      </template>
    </GpItem>
  </div>
</template>
<script lang="ts" setup>
import GpItem from '../../core/components/layout/BlockItem.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';

const store = useBlueprintsStore()
const removeWithConfirm = useConfirmAction(store.remove)
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
