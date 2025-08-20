<template>
    <el-button class="assistant-button" type="primary" size="large" circle @click="toggle" :icon="ChatDotRound" />
</template>
<script lang="ts" setup>
import { useAdminAssistantStore } from "../store/admin-assistant";
import { ChatDotRound } from "@element-plus/icons-vue";

const { toggle } = useAdminAssistantStore();
</script>

<style scoped>
.assistant-button {
  margin-inline: var(--spacing);
  transition: all 0.3s ease;
  background: linear-gradient(135deg, var(--main-color), var(--secondary-color));
}

.assistant-button:hover {
  background: linear-gradient(135deg, var(--secondary-color), var(--main-color));
}
</style>
