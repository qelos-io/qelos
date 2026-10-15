<script setup lang="ts">
defineProps<{ title?: string; hint?: string }>();
</script>

<template>
  <section class="step-section">
    <header v-if="title || $slots.aside" class="head">
      <div class="text">
        <h3 v-if="title" dir="auto">{{ title }}</h3>
        <p v-if="hint" dir="auto">{{ hint }}</p>
      </div>
      <div v-if="$slots.aside" class="aside"><slot name="aside" /></div>
    </header>
    <slot />
  </section>
</template>

<style scoped lang="scss">
.step-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-block-end: 32px;

  &:last-child {
    margin-block-end: 0;
  }
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.text {
  min-inline-size: 0;

  h3 {
    margin: 0;
    padding: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
    text-align: start;
  }
}

.aside {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}
</style>
