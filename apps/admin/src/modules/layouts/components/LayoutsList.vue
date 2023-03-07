<template>
  <div>
    <GpItem v-for="layout in layouts" :key="layout.kind">
      <template v-slot:title>
        <router-link :to="{name: 'editLayout', params: {kind: layout.kind}}">
          {{ $t(layout.displayName) }}
        </router-link>
      </template>
      <div class="metadata">
        {{ $t(layout.description) }}
      </div>
    </GpItem>
  </div>
</template>
<script lang="ts" setup>
import GpItem from '../../core/components/layout/GpItem.vue';

const layouts = [
  {kind: 'core', displayName: 'Core Layout', description: 'Change the basics of the application layout.'},
]
</script>
<style scoped>
.metadata {
  padding: 15px;
}
</style>
