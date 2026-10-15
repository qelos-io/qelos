<script setup lang="ts">
import { ref } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';

/** The raw JSON of a step, one click away: the fields above are the way in, this is for what they do not cover. */
const text = defineModel<string>({ required: true });
const props = withDefaults(defineProps<{ label?: string; height?: string }>(), { height: '240px' });
const open = ref(false);
void props;
</script>

<template>
  <div class="json-details">
    <button type="button" class="toggle" :aria-expanded="open" @click="open = !open">
      <font-awesome-icon :icon="['fas', open ? 'chevron-down' : 'chevron-right']" class="chev" aria-hidden="true" />
      {{ label || $t('Edit as JSON') }}
    </button>
    <Monaco v-if="open" :model-value="text" language="json" :height="height" @update:model-value="text = $event" />
  </div>
</template>

<style scoped lang="scss">
.json-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
}

.chev {
  inline-size: 10px;
}
</style>
