<template>
  <el-dropdown-item class="impersonation-selector" @click.stop>
    <div class="impersonation-selector__row">
      <div class="impersonation-selector__copy">
        <p class="label">{{ $t('Impersonating') }}</p>
        <p class="hint" v-if="impersonatedUser">
          {{ impersonatedUser.name || impersonatedUser.email || impersonatedUser._id }}
          <span v-if="impersonatedWorkspace">• {{ impersonatedWorkspace.name }}</span>
        </p>
        <el-tag size="small" effect="plain" class="impersonation-selector__tag">{{ $t('Admin only') }}</el-tag>
      </div>
      <div class="impersonation-selector__actions">
        <el-button
          type="danger"
          size="small"
          @click.stop="handleClearImpersonation"
        >
          {{ $t('Stop Impersonating') }}
        </el-button>
      </div>
    </div>
  </el-dropdown-item>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { impersonatedUser, impersonatedWorkspace } from '@/modules/core/store/impersonation';
import { clearImpersonation as clearImpersonationFn } from '@/services/sdk';

const handleClearImpersonation = () => {
  clearImpersonationFn();
  ElMessage.success('Stopped impersonating user');
  
  // Reload the page to ensure all data is refreshed
  setTimeout(() => {
    window.location.reload();
  }, 500);
};
</script>

<style scoped lang="scss">
.impersonation-selector {
  min-width: 260px;
  width: min(360px, 90vw);
  white-space: normal;
  padding: 4px 0;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-color-muted, #8c8c8c);
  }

  &__tag {
    align-self: flex-start;
  }

  &__actions {
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    &__row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    &__actions {
      width: 100%;
    }
  }
}
</style>
