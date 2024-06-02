<template>
  <GpItem v-for="blueprint in store.blueprints"
          :key="blueprint.identifier"
          :id="'blueprint-' + blueprint.identifier">
    <template v-slot:title>
      {{ blueprint.name }}
      <small>{{ blueprint.description }}</small>
    </template>
    <div class="metadata">
      <p v-for="(field, key) in blueprint.properties" :key="key">
        <strong>{{ key }}:</strong> {{ field.type }}
      </p>
    </div>
    <template v-slot:actions>
      <small class="link" @click.prevent="store.remove(blueprint.identifier)">
        <el-icon>
          <icon-delete/>
        </el-icon>
        {{ $t('Remove') }}
      </small>
    </template>
  </GpItem>
</template>
<script lang="ts" setup>
import GpItem from '../../core/components/layout/GpItem.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';

const store = useBlueprintsStore()
</script>
