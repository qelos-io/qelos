<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to"
    class="builder-nav-item"
    :class="{ 'is-active': active }"
    @click="handleClick"
  >
    <el-icon class="item-icon">
      <font-awesome-icon 
        v-if="typeof icon === 'string'" 
        :icon="icon.split(' ')" 
      />
      <component v-else :is="icon" />
    </el-icon>
    <Transition name="item-label">
      <span v-if="!isCollapsed" class="item-label">{{ label }}</span>
    </Transition>
    
    <!-- Badge for notifications or status -->
    <Transition name="item-badge">
      <span v-if="!isCollapsed && badge" class="item-badge">{{ badge }}</span>
    </Transition>
  </component>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  icon: string | any;
  label: string;
  to?: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

const props = defineProps<Props>();

const router = useRouter();
const isCollapsed = inject('isDrawerCollapsed', computed(() => false));

function handleClick() {
  if (props.onClick) {
    props.onClick();
  } else if (props.to) {
    router.push(props.to);
  }
}
</script>

<style scoped lang="scss">
.builder-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: 6px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
  }
  
  &.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 500;
    
    &::before {
      content: '';
      position: absolute;
      inset-inline-start: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--el-color-primary);
    }
  }
  
  .item-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  
  .item-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .item-badge {
    padding: 2px 6px;
    background: var(--el-color-danger);
    color: white;
    font-size: 10px;
    border-radius: 10px;
    font-weight: 500;
    line-height: 1;
  }
}

// Transitions
.item-label-enter-active,
.item-label-leave-active {
  transition: all 0.3s;
  overflow: hidden;
}

.item-label-enter-from,
.item-label-leave-to {
  opacity: 0;
  width: 0;
  margin: 0;
}

.item-badge-enter-active,
.item-badge-leave-active {
  transition: all 0.3s;
}

.item-badge-enter-from,
.item-badge-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

// Collapsed mode adjustments
:deep(.is-collapsed) {
  .builder-nav-item {
    justify-content: center;
    padding: 12px 8px;
    
    &:hover .item-label {
      position: absolute;
      inset-inline-start: 100%;
      margin-inline-start: 8px;
      padding: 6px 12px;
      background: var(--el-bg-color-overlay);
      border: 1px solid var(--el-border-color);
      border-radius: 6px;
      box-shadow: var(--el-box-shadow-light);
      white-space: nowrap;
      opacity: 1;
      width: auto;
      z-index: 1000;
    }
  }
}
</style>
