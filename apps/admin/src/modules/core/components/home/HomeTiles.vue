<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Plus } from '@element-plus/icons-vue';

export interface HomeTile {
  key: string;
  label: string;
  value?: number | string;
  loading?: boolean;
  icon: string[];
  to?: any;
  /** a tracked blueprint can be removed from the home */
  removable?: boolean;
}

const props = defineProps<{
  tiles: HomeTile[];
  addable: { identifier: string; name: string }[];
}>();
const emit = defineEmits<{ add: [identifier: string]; remove: [identifier: string] }>();

const picker = ref(false);
const selected = ref('');
const format = (value?: number | string) => (typeof value === 'number' ? new Intl.NumberFormat().format(value) : (value ?? '—'));

function choose(identifier: string) {
  if (!identifier) return;
  emit('add', identifier);
  selected.value = '';
  picker.value = false;
}

const hasAdd = computed(() => props.addable.length > 0);
</script>

<template>
  <ul class="tiles">
    <li v-for="tile in tiles" :key="tile.key" class="tile">
      <component :is="tile.to ? 'router-link' : 'div'" v-bind="tile.to ? { to: tile.to } : {}" class="tile-body">
        <span class="tile-label">
          <font-awesome-icon :icon="tile.icon" class="tile-icon" aria-hidden="true" />
          {{ tile.label }}
        </span>
        <span class="tile-value">
          <el-skeleton-item v-if="tile.loading" variant="text" style="inline-size: 40px" />
          <template v-else>{{ format(tile.value) }}</template>
        </span>
      </component>
      <button v-if="tile.removable" type="button" class="tile-remove" :aria-label="`${$t('Remove')}: ${tile.label}`" @click="emit('remove', tile.key)">
        <font-awesome-icon :icon="['fas', 'xmark']" />
      </button>
    </li>

    <li v-if="hasAdd" class="tile add">
      <el-popover v-model:visible="picker" placement="bottom-start" :width="340" trigger="click">
        <template #reference>
          <button type="button" class="tile-body add-body">
            <el-icon><Plus /></el-icon>
            <span>{{ $t('Track a blueprint') }}</span>
          </button>
        </template>
        <p class="picker-title">{{ $t('Add Blueprint to Dashboard') }}</p>
        <el-select v-model="selected" :placeholder="$t('Choose a blueprint to track...')" clearable filterable style="inline-size: 100%" @change="choose">
          <el-option v-for="blueprint in addable" :key="blueprint.identifier" :label="blueprint.name" :value="blueprint.identifier" />
          <template #empty>{{ $t('All blueprints are already added') }}</template>
        </el-select>
      </el-popover>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  position: relative;
}

.tile-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  inline-size: 100%;
  min-block-size: 96px;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

a.tile-body:hover,
button.tile-body:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

a.tile-body:focus-visible,
button.tile-body:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.tile-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 0.88rem;
}

.tile-icon {
  color: var(--el-color-primary);
}

.tile-value {
  font-size: 1.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tile-remove {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-end: 6px;
  display: grid;
  place-items: center;
  inline-size: 28px;
  block-size: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-color-danger);
  }
}

.tile:hover .tile-remove,
.tile-remove:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .tile-remove {
    opacity: 1;
  }
}

.add-body {
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 8px;
  border-style: dashed;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.picker-title {
  margin: 0 0 8px;
  font-weight: 600;
}

@media (max-width: 639px) {
  .tile.add {
    grid-column: 1 / -1;
  }

  .tiles {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .tile-body {
    min-block-size: 84px;
    padding: 12px;
  }

  .tile-value {
    font-size: 1.6rem;
  }
}
</style>
