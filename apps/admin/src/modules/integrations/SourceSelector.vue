<template>
  <div class="source-grid">
    <div v-for="source in sources" :key="source.value" class="source-item" :class="{ selected: source.value === model }"
      @click="model = source.value">
      <img :src="source.logo" :alt="source.value" class="source-logo" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel } from 'vue';

export interface Source {
  value: string;
  logo: string;
  name?: string;
}

const model = defineModel<string>();

const props = defineProps<{
  sources: Source[];
}>();
</script>

<style scoped>
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
  width: 100%;
}

.source-item {
  border: 1px solid #ddd;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  transition: 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100px;
  box-sizing: border-box;
}

.source-item.selected {
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.8);
  border-color: #007bff;
}

.source-logo {
  max-height: 60px;
  width: auto;
}

.source-item:hover {
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}
</style>