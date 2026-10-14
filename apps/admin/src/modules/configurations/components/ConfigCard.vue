<script lang="ts" setup>
defineProps<{ title: string; description?: string; id?: string }>();
</script>

<template>
  <section class="config-card" :aria-labelledby="id">
    <header class="head">
      <div>
        <h2 :id="id">{{ title }}</h2>
        <p v-if="description" class="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="actions"><slot name="actions" /></div>
    </header>
    <div class="body"><slot /></div>
  </section>
</template>

<style scoped lang="scss">
.config-card {
  min-inline-size: 0;
  padding: 18px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 12px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.05rem;
  }
}

.description {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 639px) {
  .config-card {
    padding: 14px;
  }
}
</style>
