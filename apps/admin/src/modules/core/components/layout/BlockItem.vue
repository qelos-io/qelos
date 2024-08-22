<template>
  <el-card class="container">
    <LiveEditColorOpener v-if="isAdmin" color="negativeColor"/>
    <template v-if="$slots.title" #header>
      <h3><slot name="title"/></h3>
    </template>
    <slot/>
    <template #footer v-if="$slots.actions">
      <slot name="actions"/>
    </template>
  </el-card>
</template>

<style scoped lang="scss">
</style>
<script setup lang="ts">
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import { isAdmin } from '@/modules/core/store/auth';
</script>