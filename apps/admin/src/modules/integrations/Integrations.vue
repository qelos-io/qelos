<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, Plus } from '@element-plus/icons-vue';
import { useLegacyEditorRedirect } from '@/modules/integrations/compositions/legacy-editor-redirect';
import AutomationsView from '@/modules/integrations/components/automations/AutomationsView.vue';
import ConnectionsPanel from '@/modules/integrations/components/connections/ConnectionsPanel.vue';

const route = useRoute();
const router = useRouter();

const query = (updates: Record<string, string | undefined>) => {
  const next = { ...route.query, ...updates } as Record<string, any>;
  for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
  return next;
};

// the old list / workflows / connections views map to the two tabs (workflows is the list's map display)
const tab = computed({
  get: () => (route.query.view === 'connections' ? 'connections' : 'automations'),
  set: (value) => router.replace({ query: query({ view: value === 'connections' ? 'connections' : undefined, display: undefined }) }),
});

useLegacyEditorRedirect();

const newAutomation = (kind: string) => router.push({ name: 'integration-new', query: { type: kind } });
</script>

<template>
  <div class="integrations-page">
    <header class="page-head">
      <div>
        <h1>{{ $t('Integrations') }}</h1>
        <p>{{ $t('Connect your application to other services: react to events, call APIs and run AI agents.') }}</p>
      </div>
      <el-dropdown trigger="click" @command="newAutomation">
        <el-button type="primary"><el-icon><Plus /></el-icon>{{ $t('New') }}<el-icon class="caret"><ArrowDown /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="agent">
              <span class="choice"><strong>{{ $t('AI agent') }}</strong><small>{{ $t('A guided wizard for conversational agents with tools') }}</small></span>
            </el-dropdown-item>
            <el-dropdown-item command="workflow">
              <span class="choice"><strong>{{ $t('Workflow') }}</strong><small>{{ $t('Connect a trigger to an action, step by step') }}</small></span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <div class="tabs" role="tablist" :aria-label="$t('Integrations')">
      <button type="button" role="tab" class="tab" :class="{ active: tab === 'automations' }" :aria-selected="tab === 'automations'" @click="tab = 'automations'">{{ $t('Automations') }}</button>
      <button type="button" role="tab" class="tab" :class="{ active: tab === 'connections' }" :aria-selected="tab === 'connections'" @click="tab = 'connections'">{{ $t('Connections') }}</button>
    </div>

    <AutomationsView v-if="tab === 'automations'" />
    <ConnectionsPanel v-else />

  </div>
</template>

<style scoped lang="scss">
.integrations-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 32px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.caret {
  margin-inline-start: 6px;
}

.choice {
  display: flex;
  flex-direction: column;
  max-inline-size: 280px;
  padding-block: 2px;
  line-height: 1.3;

  small {
    color: var(--el-text-color-secondary);
    white-space: normal;
  }
}

.tabs {
  display: flex;
  gap: 4px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.tab {
  margin-block-end: -1px;
  padding: 8px 14px;
  border: 0;
  border-block-end: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }

  &.active {
    border-block-end-color: var(--el-color-primary);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

@media (max-width: 639px) {
  .integrations-page {
    padding: 12px 12px 24px;
  }
}
</style>
