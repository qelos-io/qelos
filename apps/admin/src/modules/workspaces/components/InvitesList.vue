<template>
  <h2>Invites to workspaces</h2>
  <GpItem v-for="invite in store.invites" :key="invite._id">
    <template v-slot:title>
      {{ invite.workspace.name }}
    </template>
    <template v-slot:actions>
      <small class="link">
        {{ $t('Accept') }}
      </small>
      |
      <small class="link">
        {{ $t('Decline') }}
      </small>
    </template>
  </GpItem>
</template>
<script lang="ts" setup>
import GpItem from '../../core/components/layout/BlockItem.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';

const store = useInvitesList()
</script>
