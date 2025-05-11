<template>
  <div class="invites-container">
    <div class="invites-header">
      <h2>{{ $t('Invites to workspaces') }}</h2>
      <el-button 
        size="small" 
        type="primary" 
        :icon="RefreshRight" 
        circle 
        @click="refreshInvites" 
        :loading="isLoading"
      />
    </div>

    <el-skeleton :loading="isLoading && !store.invites.length" animated :count="2">
      <template #template>
        <div class="skeleton-item">
          <el-skeleton-item variant="p" style="width: 60%" />
          <div style="display: flex; justify-content: flex-end">
            <el-skeleton-item variant="button" style="width: 60px; margin-right: 10px" />
            <el-skeleton-item variant="button" style="width: 60px" />
          </div>
        </div>
      </template>

      <template #default>
        <el-empty v-if="!store.invites.length" :description="$t('No pending invitations')" />

        <el-card 
          v-for="invite in store.invites" 
          :key="invite._id" 
          class="invite-card"
          shadow="hover"
        >
          <div class="invite-content">
            <div class="invite-info">
              <h3>{{ invite.name }}</h3>
              <p class="invite-description">{{ $t('You have been invited to join this workspace') }}</p>
            </div>
            <div class="invite-actions">
              <el-button 
                type="success" 
                @click="handleAccept(invite)" 
                :loading="actionInProgress === invite._id && currentAction === 'accept'"
              >
                {{ $t('Accept') }}
              </el-button>
              <el-button 
                type="danger" 
                @click="handleDecline(invite)" 
                :loading="actionInProgress === invite._id && currentAction === 'decline'"
              >
                {{ $t('Decline') }}
              </el-button>
            </div>
          </div>
        </el-card>
      </template>
    </el-skeleton>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { RefreshRight } from '@element-plus/icons-vue';
import useInvitesList, { InviteKind } from '@/modules/workspaces/store/invites-list';

const store = useInvitesList();
const isLoading = ref(false);
const actionInProgress = ref('');
const currentAction = ref('');

const refreshInvites = async () => {
  isLoading.value = true;
  try {
    await store.reload();
  } finally {
    isLoading.value = false;
  }
};

const handleAccept = async (invite: any) => {
  actionInProgress.value = invite._id;
  currentAction.value = 'accept';
  try {
    await store.respondToInvite({
      workspace: invite._id,
      kind: InviteKind.ACCEPT
    });
  } finally {
    actionInProgress.value = '';
    currentAction.value = '';
  }
};

const handleDecline = async (invite: any) => {
  actionInProgress.value = invite._id;
  currentAction.value = 'decline';
  try {
    await store.respondToInvite({
      workspace: invite._id,
      kind: InviteKind.DECLINE
    });
  } finally {
    actionInProgress.value = '';
    currentAction.value = '';
  }
};

// Load invites when component is mounted
store.promise;
</script>

<style scoped>
.invites-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.invites-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.invite-card {
  margin-bottom: 16px;
}

.invite-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.invite-info {
  flex: 1;
}

.invite-info h3 {
  margin: 0 0 8px 0;
}

.invite-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

.skeleton-item {
  padding: 20px;
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .invites-container {
    padding: 0 16px;
  }
  
  .invite-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .invite-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>
