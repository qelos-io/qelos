<script lang="ts" setup>
defineOptions({ inheritAttrs: false });
import EntityBillingPanel from '@/modules/pricing-plans/components/EntityBillingPanel.vue';
import { subscriptionRoute } from '@/modules/pricing-plans/services/entity-links';

defineProps<{ workspace: any }>();
const emit = defineEmits<{ (e: 'billing-changed'): void }>();
</script>

<template>
  <div class="billing-tab">
    <router-link class="subscribers-link" :to="subscriptionRoute('workspace', workspace._id)">
      {{ $t('View in Subscribers') }} →
    </router-link>
    <EntityBillingPanel
      billable-entity-type="workspace"
      :billable-entity-id="workspace._id"
      @changed="emit('billing-changed')"
    />
  </div>
</template>

<style scoped>
.billing-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subscribers-link {
  align-self: flex-end;
  font-size: 0.875rem;
  color: var(--el-color-primary);
  text-decoration: none;
}

.subscribers-link:hover {
  text-decoration: underline;
}
</style>
