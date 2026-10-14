<template>
    <el-button class="assistant-button" size="large" circle :aria-label="$t('AI Chat')" :title="$t('AI Chat')" @click="toggle">
      <img src="/logos/ai-chat-icon.svg" alt="" aria-hidden="true" />
    </el-button>
</template>
<script lang="ts" setup>
import { useAdminAssistantStore } from "../store/admin-assistant";

const { toggle } = useAdminAssistantStore();
</script>

<style scoped>
.assistant-button.is-circle {
  margin-inline: var(--spacing);
  padding: 0;
  border: 0;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.assistant-button:hover {
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.2);
  cursor: pointer;
}

.assistant-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .assistant-button.is-circle {
    transition: none;
  }
}

img {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
