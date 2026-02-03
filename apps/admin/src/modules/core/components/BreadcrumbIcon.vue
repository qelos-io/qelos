<template>
  <el-icon class="breadcrumb-icon" v-if="isElementPlusIcon">
    <component :is="icon" />
  </el-icon>
  <font-awesome-icon v-else :icon="icon" class="breadcrumb-icon" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon: any
}

const props = defineProps<Props>()

const isElementPlusIcon = computed(() => {
  // Check if icon is an Element Plus icon (has a name property and is not an array)
  return props.icon && typeof props.icon === 'object' && !Array.isArray(props.icon) && 'name' in props.icon
})
</script>

<style scoped>
.breadcrumb-icon {
  margin-right: 5px;
  color: var(--main-color);
}

/* Dark theme support - use :global() to affect the component in dark mode */
:global([data-theme="dark"]) .breadcrumb-icon {
  color: var(--secondary-color);
}
</style>
