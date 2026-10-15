<script lang="ts" setup>
import { ref } from 'vue';
import useInvitesList, { InviteKind } from '@/modules/workspaces/store/invites-list';
import WorkspaceAvatar from './WorkspaceAvatar.vue';

const store = useInvitesList();
const busy = ref<{ id: string; kind: InviteKind } | null>(null);

async function respond(invite: any, kind: InviteKind) {
  busy.value = { id: invite._id, kind };
  try {
    await store.respondToInvite({ workspace: invite._id, kind });
  } finally {
    busy.value = null;
  }
}

const loading = (invite: any, kind: InviteKind) => busy.value?.id === invite._id && busy.value.kind === kind;
</script>

<template>
  <section v-if="store.invites.length" class="invites" :aria-label="$t('Invitations')">
    <h2>{{ $t('You have been invited') }}</h2>
    <ul>
      <li v-for="invite in store.invites" :key="invite._id">
        <WorkspaceAvatar :name="invite.name" :logo="invite.logo" :size="36" />
        <div class="text">
          <strong dir="auto">{{ invite.name }}</strong>
          <span>{{ $t('Join this workspace to work with its members.') }}</span>
        </div>
        <div class="actions">
          <el-button type="primary" :loading="loading(invite, InviteKind.ACCEPT)" :disabled="!!busy" @click="respond(invite, InviteKind.ACCEPT)">{{ $t('Accept') }}</el-button>
          <el-button :loading="loading(invite, InviteKind.DECLINE)" :disabled="!!busy" @click="respond(invite, InviteKind.DECLINE)">{{ $t('Decline') }}</el-button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.invites {
  margin-block-end: 20px;
  padding: 14px 16px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 12px;
  background: var(--el-color-primary-light-9);

  h2 {
    margin: 0 0 10px;
    padding: 0;
    font-size: 1rem;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
  }
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 180px;

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.88rem;
  }
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
