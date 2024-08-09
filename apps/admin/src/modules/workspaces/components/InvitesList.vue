<template>
  <h2>Invites to workspaces</h2>
  <BlockItem v-for="invite in store.invites" :key="invite._id">
    <template v-slot:title>
      {{ invite.name }}
    </template>
    <template v-slot:actions>
      <small class="link" @click="store.respondToInvite({workspace: invite._id, kind: InviteKind.ACCEPT})">
        {{ $t('Accept') }}
      </small>
      |
      <small class="link" @click="store.respondToInvite({workspace: invite._id, kind: InviteKind.DECLINE})">
        {{ $t('Decline') }}
      </small>
    </template>
  </BlockItem>
</template>
<script lang="ts" setup>
import BlockItem from '../../core/components/layout/BlockItem.vue';
import useInvitesList, { InviteKind } from '@/modules/workspaces/store/invites-list';

const store = useInvitesList()
</script>
