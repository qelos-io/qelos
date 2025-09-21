<template>
    <el-button class="assistant-button" size="large" circle @click="toggle">
      <img src="/logos/ai-chat-icon.svg" alt="AI Chat" />
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
  transition: box-shadow 0.3s ease;
}

.assistant-button:hover {
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.2);
  cursor: pointer;
}

img {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
