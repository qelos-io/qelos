<template>
  <div class="ai-panel-content" v-if="visible">
    <AiChat v-if="sourceId" :url="url" class="ai-chat" />
    <div v-else class="no-source-container">
      <el-empty description="No OpenAI integration source found">
        <template #default>
          <el-button type="primary" @click="navigateToOpenAIIntegration">Add OpenAI Integration</el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, toRef } from "vue";
import { useRouter } from "vue-router";
import { useAdminAssistantStore } from "../store/admin-assistant";
import AiChat from "@/modules/pre-designed/components/AiChat.vue";
import { useIntegrationSourcesStore } from "@/modules/integrations/store/integration-sources";

const router = useRouter();
const store = useAdminAssistantStore();
const visible = toRef(store, "isOpen");

const sources = useIntegrationSourcesStore();

const sourceId = computed(() => {
  return sources.groupedSources.openai[0]?._id;
});

const url = computed(() => {
  return `/api/ai/sources/${sourceId.value}/chat-completion`;
});

const navigateToOpenAIIntegration = () => {
  store.toggle(); // Close the panel
  router.push({ name: "integrations-sources", params: { kind: "openai" } });
};
</script>
<style scoped>
.ai-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  position: relative;
  height: 100%;
}

.no-source-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.ai-chat {
  height: 100%;
}

.ai-chat :deep(.chat-window) {
  max-height: 100%;
}
</style>
