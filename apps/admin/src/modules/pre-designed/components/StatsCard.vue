<script setup lang="ts">
import { computed } from 'vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';

const props = defineProps<{
  value: number;
  title: string;
  label?: string;
  color?: string;
  actionText?: string;
  actionRoute?: string;
  icon?: string;
  faIcon?: string[];
}>()

const goodPalette = {
  green: '#13ce66',
  red: '#ff4949',
  blue: '#5266d4',
  yellow: '#f7ba2a',
  purple: '#9c6ade',
  orange: '#ff9f00',
  pink: '#ff5b95',
  cyan: '#2bcbd1',
  gray: '#8391a5',
  primary: '#409eff',
  success: '#67c23a',
  warning: '#e6a23c',
  danger: '#f56c6c',
  info: '#909399',
}
const darkColorNamesFromPalette = ['red', 'purple', 'blue', 'orange', 'danger', 'info'];

const bgColor = computed(() => goodPalette[props.color] || props.color);

const forceFontColor = computed(() => {
  return darkColorNamesFromPalette.includes(props.color) ? 'white' : undefined;
})
</script>

<template>
  <BlockItem class="stats-card">
    <el-statistic :value="value">
      <template #title>
        <div class="stats-title">
          {{ $t(title) }}
          <InfoIcon v-if="label" :content="label"/>
        </div>
      </template>
    </el-statistic>
    <el-icon class="bg-icon">
      <component v-if="icon" :is="'icon-' + icon"/>
      <font-awesome-icon v-else-if="faIcon" :icon="faIcon"/>
    </el-icon>
    <template v-if="$slots.footer || actionText" #actions>
      <el-button class="actions" v-if="actionText" @click="$router.push(actionRoute)">
        {{ $t(actionText) }}
      </el-button>
      <slot v-else name="footer" class="actions"/>
    </template>
  </BlockItem>
</template>

<style scoped>
.stats-card {
  --el-card-bg-color: v-bind(bgColor);
  position: relative;
}
.el-statistic {
  --el-statistic-title-color: v-bind(forceFontColor);
  --el-statistic-content-color: v-bind(forceFontColor);
}

.stats-title {
  display: inline-flex;
  align-items: center;
  font-size: 120%;
}
.stats-card :deep(.el-card__footer) {
    border-top: none;
}

.bg-icon {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 100px;
  color: rgba(0, 0, 0, 0.1);
  transform: rotate(45deg);
  z-index: 0;
}

.actions {
  z-index: 1;
}
</style>