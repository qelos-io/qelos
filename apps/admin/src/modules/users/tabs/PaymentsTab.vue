<template>
  <div class="payments-tab">
    <BillingOverview v-if="entityId" billable-entity-type="user" :billable-entity-id="entityId" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import BillingOverview from '@/modules/billing/components/BillingOverview.vue'
import type { IUser } from '@/modules/core/store/types/user'

const props = defineProps<{
  user?: IUser
  userId?: string
}>()

const entityId = computed(() => props.userId || props.user?._id || '')
</script>
