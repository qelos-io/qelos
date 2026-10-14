<script lang="ts" setup>
import McpEndpointPanel from '@/modules/configurations/components/McpEndpointPanel.vue';
import { MCP_DOCS_BASE_URL } from '@qelos/global-types';

defineProps<{
  actions: { text: string; icon: string[]; route: any }[];
  mcpEnabled: boolean;
  mcpLoading: boolean;
}>();
</script>

<template>
  <div class="shortcuts">
    <section class="card" :aria-label="$t('Quick actions')">
      <header class="head"><h2>{{ $t('Quick actions') }}</h2></header>
      <ul class="actions">
        <li v-for="action in actions" :key="action.text">
          <router-link :to="action.route" class="action">
            <font-awesome-icon :icon="action.icon" class="action-icon" aria-hidden="true" />
            <span class="action-text">{{ action.text }}</span>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="action-go" aria-hidden="true" />
          </router-link>
        </li>
      </ul>
    </section>

    <section class="card" :aria-label="$t('MCP connection')" v-loading="mcpLoading">
      <header class="head">
        <h2>{{ $t('MCP connection') }}</h2>
        <el-tag :type="mcpEnabled ? 'success' : 'info'" effect="light" size="small">{{ mcpEnabled ? $t('Enabled') : $t('Disabled') }}</el-tag>
      </header>
      <p class="hint">{{ $t('MCP dashboard description') }}</p>
      <div class="panel"><McpEndpointPanel variant="compact" :muted="!mcpEnabled" /></div>
      <footer class="foot">
        <router-link :to="{ name: 'editConfiguration', params: { key: 'mcp-configuration' } }">{{ $t('Configure MCP') }}</router-link>
        <a :href="MCP_DOCS_BASE_URL" target="_blank" rel="noopener">{{ $t('MCP overview') }}<font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="ext" aria-hidden="true" /></a>
      </footer>
    </section>
  </div>
</template>

<style scoped lang="scss">
.shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 6px;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}

.actions {
  margin: 0;
  padding: 4px 8px 8px;
  list-style: none;
}

.action {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 44px;
  padding: 0 10px;
  border-radius: calc(var(--border-radius, 6px) + 1px);
  color: var(--el-text-color-primary);
  text-decoration: none;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.action-icon {
  inline-size: 18px;
  color: var(--el-color-primary);
}

.action-text {
  flex: 1;
}

.action-go {
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

[dir='rtl'] .action-go {
  transform: scaleX(-1);
}

.hint {
  margin: 0;
  padding: 0 16px 8px;
  color: var(--el-text-color-secondary);
  font-size: 0.88rem;
}

.panel {
  padding: 0 16px;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 12px 16px 14px;
  font-size: 0.88rem;

  a {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.ext {
  margin-inline-start: 6px;
  font-size: 0.7rem;
}
</style>
