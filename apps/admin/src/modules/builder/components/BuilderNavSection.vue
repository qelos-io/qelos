<template>
  <div class="builder-nav-section">
    <!-- Section header -->
    <div 
      class="section-header"
      :class="{ 'is-clickable': collapsible }"
      @click="collapsible ? toggleExpanded() : null"
    >
      <el-icon class="section-icon">
        <font-awesome-icon 
          v-if="typeof icon === 'string'" 
          :icon="icon.split(' ')" 
        />
        <component v-else :is="icon" />
      </el-icon>
      <Transition name="section-title">
        <span v-if="!isCollapsed" class="section-title">{{ title }}</span>
      </Transition>
      <el-icon 
        v-if="collapsible && !isCollapsed"
        class="expand-icon"
        :class="{ 'is-expanded': isExpanded }"
      >
        <ArrowDown />
      </el-icon>
    </div>
    
    <!-- Section items -->
    <Transition name="section-items">
      <div v-show="!collapsible || isExpanded" class="section-items">
        <slot>
          <!-- Show collapsed items when drawer is collapsed -->
          <template v-if="isCollapsed && collapsedItems">
            <slot name="collapsed">
              <div
                v-for="item in collapsedItems"
                :key="item.path || item.key"
                class="collapsed-item"
                :title="item.label"
              >
                <el-icon>
                  <font-awesome-icon 
                    v-if="typeof item.icon === 'string'" 
                    :icon="item.icon.split(' ')" 
                  />
                  <component v-else :is="item.icon" />
                </el-icon>
              </div>
            </slot>
          </template>
          <!-- Show all items when drawer is expanded -->
          <template v-else>
            <slot name="default" />
          </template>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

interface Props {
  title: string;
  icon: any;
  collapsible?: boolean;
  collapsedItems?: any[];
  defaultExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: false,
  defaultExpanded: true
});

// Inject drawer state from parent
const isCollapsed = inject('isDrawerCollapsed', ref(false));

const isExpanded = ref(props.defaultExpanded);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style scoped lang="scss">
.builder-nav-section {
  margin-bottom: 8px;
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    user-select: none;
    
    &.is-clickable {
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      
      &:hover {
        background: var(--el-fill-color-light);
        color: var(--el-text-color-primary);
      }
    }
    
    .section-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    
    .section-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .expand-icon {
      font-size: 12px;
      transition: transform 0.3s;
      
      &.is-expanded {
        transform: rotate(180deg);
      }
    }
  }
  
  .section-items {
    .collapsed-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      margin: 2px 0;
      border-radius: 6px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: var(--el-fill-color-light);
        color: var(--el-color-primary);
      }
      
      .el-icon {
        font-size: 18px;
      }
    }
  }
}

// Transitions
.section-title-enter-active,
.section-title-leave-active {
  transition: all 0.3s;
  overflow: hidden;
}

.section-title-enter-from,
.section-title-leave-to {
  opacity: 0;
  width: 0;
  margin: 0;
}

.section-items-enter-active,
.section-items-leave-active {
  transition: all 0.3s;
  overflow: hidden;
}

.section-items-enter-from,
.section-items-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

// Collapsed mode adjustments
:deep(.is-collapsed) {
  .builder-nav-section {
    .section-header {
      justify-content: center;
      padding: 12px 8px;
      
      .section-title,
      .expand-icon {
        display: none;
      }
    }
    
    .section-items {
      padding: 0 4px;
    }
  }
}
</style>
