<template>
    <template v-if="isPrivilegedUser && (isManagingEnabled || isEditingEnabled)">
        <AssetsDetailsPanel />
        <AdminAiDrawer/>  
    </template>
</template>
<script setup lang="ts">
import { isEditingEnabled, isManagingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import AssetsDetailsPanel from '@/modules/assets/components/AssetsDetailsPanel/AssetsDetailsPanel.vue';
import AdminAiDrawer from './AdminAiDrawer.vue';
</script>
<style scoped>
</style>
