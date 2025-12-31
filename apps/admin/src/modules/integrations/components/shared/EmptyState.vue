<script setup lang="ts">
import { computed } from 'vue';
import { ElEmpty, ElButton } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

interface Props {
  type: 'connections' | 'integrations' | 'workflows';
  actionText?: string;
  showAction?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAction: true
});

const emit = defineEmits<{
  action: [];
}>();

const emptyStateConfig = computed(() => {
  switch (props.type) {
    case 'connections':
      return {
        description: 'Start by connecting your first provider',
        actionText: props.actionText || 'Create connection'
      };
    case 'integrations':
      return {
        description: 'No integrations found',
        actionText: props.actionText || 'Add Integration'
      };
    case 'workflows':
      return {
        description: 'No integrations found',
        actionText: props.actionText || 'Create Integration'
      };
    default:
      return {
        description: 'No data found',
        actionText: props.actionText || 'Add New'
      };
  }
});

const handleAction = () => {
  emit('action');
};
</script>

<template>
  <div class="empty-state">
    <el-empty 
      :description="emptyStateConfig.description"
      class="empty-state__content"
    >
      <el-button 
        v-if="showAction"
        type="primary" 
        @click="handleAction"
        :icon="Plus"
      >
        {{ emptyStateConfig.actionText }}
      </el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 40px 20px;
  border-radius: var(--border-radius);
  border: 1px dashed var(--el-border-color-lighter);
  background-color: var(--el-bg-color-page);
}

.empty-state__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

@media (max-width: 768px) {
  .empty-state {
    min-height: 200px;
    padding: 20px;
  }
}
</style>
