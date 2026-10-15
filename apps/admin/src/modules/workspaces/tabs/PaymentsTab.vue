<template>
  <div class="payments-tab">
    <BillingOverview billable-entity-type="workspace" :billable-entity-id="workspaceId" />
  </div>
</template>

<script lang="ts" setup>
import BillingOverview from '@/modules/billing/components/BillingOverview.vue'

defineOptions({ inheritAttrs: false })
defineProps<{
  workspaceId: string
  workspace?: Record<string, any>
}>()
</script>
