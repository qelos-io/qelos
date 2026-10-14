<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  loading: boolean;
  events: number;
  errors: number;
  rate: string;
}>();

const healthy = computed(() => !props.loading && props.errors === 0);
</script>

<template>
  <section class="status" :class="{ warn: !loading && errors > 0 }" :aria-label="$t('Platform status')">
    <el-skeleton v-if="loading" animated :rows="0" class="skeleton"><template #template><el-skeleton-item variant="text" style="inline-size: 260px" /></template></el-skeleton>
    <template v-else>
      <span class="dot" aria-hidden="true" />
      <p class="line" role="status">
        <strong v-if="healthy">{{ $t('All systems normal') }}</strong>
        <strong v-else>{{ $t('{count} error signals in the last 24 hours', { count: errors }) }}</strong>
        <span class="detail">
          <template v-if="healthy">{{ $t('{count} events recorded in 24 hours, none of them errors', { count: events }) }}</template>
          <template v-else>{{ $t('{rate} of {count} events', { rate, count: events }) }}</template>
        </span>
      </p>
      <router-link class="link" :to="{ name: 'log' }">{{ $t('Open events log') }}</router-link>
    </template>
  </section>
  <div v-if="$slots.default" class="attention"><slot /></div>
</template>

<style scoped lang="scss">
.status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.dot {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  background: var(--el-color-success);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--el-color-success) 22%, transparent);
}

.warn .dot {
  background: var(--el-color-warning);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--el-color-warning) 24%, transparent);
}

.line {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 2px 10px;
  min-inline-size: 0;
  margin: 0;
  color: var(--el-text-color-primary);
  text-align: start;

  strong {
    font-weight: 600;
  }
}

.detail {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.link {
  flex: none;
  color: var(--el-color-primary);
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.attention:empty {
  display: none;
}

.attention {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block-start: 8px;
}

@media (max-width: 639px) {
  .status {
    flex-wrap: wrap;
  }

  .link {
    margin-inline-start: 22px;
  }
}
</style>
