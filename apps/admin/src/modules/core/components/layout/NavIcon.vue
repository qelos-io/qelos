<script lang="ts" setup>
import type { NavIcon } from '../../services/navigation-model';

defineProps<{ icon: NavIcon }>();
</script>

<template>
  <el-icon aria-hidden="true">
    <component :is="'icon-' + (icon as any).mfe" v-if="icon && 'mfe' in icon" />
    <font-awesome-icon v-else :icon="['fas', icon && 'fa' in icon ? icon.fa : 'circle-dot']" />
  </el-icon>
</template>
