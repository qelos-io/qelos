<script setup lang="ts">
import { inject, ref } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const editableManager = inject('editableManager');


</script>

<template>
  <div>
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el.lastElementChild)"/>
    <slot />
  </div>
</template>