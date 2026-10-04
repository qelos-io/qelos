<script lang="ts" setup>
defineOptions({ inheritAttrs: false });
import EntityBillingPanel from '@/modules/pricing-plans/components/EntityBillingPanel.vue';

defineProps<{ workspace: any }>();
const emit = defineEmits<{ (e: 'billing-changed'): void }>();
</script>

<template>
  <EntityBillingPanel
    billable-entity-type="workspace"
    :billable-entity-id="workspace._id"
    @changed="emit('billing-changed')"
  />
</template>
