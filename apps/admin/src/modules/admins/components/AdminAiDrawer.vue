<template>
  <Transition name="slide-fade">
    <div class="ai-panel-content" v-if="visible">
      <Transition name="fade" mode="out-in">
        <AiChat v-if="sourceId" :chat-context="chatContext" :url="url" class="ai-chat" key="chat" :suggestions="suggestions" />
        <div v-else class="no-source-container" key="empty">
          <el-empty description="No OpenAI integration source found">
            <template #default>
              <el-button type="primary" @click="navigateToOpenAIIntegration">{{ $t("Add OpenAI Integration") }}</el-button>
            </template>
          </el-empty>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
<script setup lang="ts">
import { computed, toRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAdminAssistantStore } from "../store/admin-assistant";
import AiChat from "@/modules/pre-designed/components/AiChat.vue";
import { useIntegrationSourcesStore } from "@/modules/integrations/store/integration-sources";


const suggestions = [
  { label: 'Create Blueprint (Data Model)', value: 'create a new blueprint', icon: 'fa-database' },
  { label: 'Add Form to Page', value: 'add a form component', icon: 'fa-clipboard' },
  { label: 'Add Free Text/HTML', value: 'add free text or html content', icon: 'fa-font' },
  { label: 'Create UI Component', value: 'create a new UI component', icon: 'fa-puzzle-piece' },
  { label: 'Edit Blueprint Permissions', value: 'edit permissions for a blueprint', icon: 'fa-user-shield' },
  { label: 'Design SaaS Page', value: 'add or edit a page UI', icon: 'fa-file-alt' },
  { label: 'View All Components', value: 'list all components', icon: 'fa-cubes' },
  { label: 'View All Blueprints', value: 'list all blueprints', icon: 'fa-sitemap' },
  { label: 'Generate Custom Logic', value: 'create or edit business logic', icon: 'fa-cogs' }
];

const router = useRouter();
const route = useRoute();
const store = useAdminAssistantStore();
const visible = toRef(store, "isOpen");

const sources = useIntegrationSourcesStore();

const sourceId = computed(() => {
  return sources.groupedSources.openai[0]?._id;
});

const url = computed(() => {
  return `/api/ai/sources/${sourceId.value}/chat-completion`;
});

const chatContext = computed(() => {
  const mfe: any = route.meta?.mfe || {}
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currentPage: route.path,
    pluginId: route.params.pluginId || route.meta?.pluginId,
    pagePluginId: mfe.pluginId,
    pageId: mfe._id,
    pageName: mfe._id,
    componentId: route.params.componentId,
  }
});

const navigateToOpenAIIntegration = () => {
  store.toggle(); // Close the panel
  router.push({ name: "integrations-sources", params: { kind: "openai" } });
};
</script>
<style scoped>
.ai-panel-content {
  overflow-y: auto;
  padding: 0;
  position: relative;
  height: calc(100% - var(--header-height));
  width: 35%;
  min-width: 500px;
  background-color: var(--el-bg-color);
}

@media (max-width: 768px) {
  .ai-panel-content {
    position: fixed;
    width: 100%;
    top: 60px; /* Adjust based on your header height */
    bottom: 0;
    left: 0;
    right: 0;
    min-width: unset;
    z-index: 2000;
  }
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

/* Slide fade transition for the panel */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(30px);
  opacity: 0;
}

/* Fade transition for content switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
