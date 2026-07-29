<template>
  <div
    class="mcp-endpoint-panel"
    :class="{
      'mcp-endpoint-panel--compact': variant === 'compact',
      'mcp-endpoint-panel--muted': muted,
    }"
  >
    <header v-if="variant === 'full'" class="endpoint-header">
      <p class="panel-eyebrow">{{ $t('Connection') }}</p>
      <h3 class="endpoint-heading">{{ $t('MCP connection details') }}</h3>
    </header>

    <div class="endpoint-box">
      <div class="endpoint-title">
        <el-icon><font-awesome-icon :icon="['fas', 'link']" /></el-icon>
        <span>{{ $t('MCP endpoint') }}</span>
      </div>

      <el-input :model-value="endpointUrl" readonly dir="ltr" class="endpoint-input">
        <template #append>
          <el-button native-type="button" @click="copyEndpointUrl">
            {{ $t('Copy') }}
          </el-button>
        </template>
      </el-input>

      <p v-if="variant === 'full'" class="endpoint-helper">
        {{ $t('MCP endpoint helper') }}
      </p>
    </div>

    <nav v-if="docsLinksVisible" class="docs-links" aria-label="MCP documentation">
      <a
        :href="MCP_DOCS_BASE_URL"
        target="_blank"
        rel="noopener"
        class="docs-link"
      >
        <font-awesome-icon :icon="['fas', 'book']" />
        {{ $t('MCP overview') }}
        <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="docs-link-icon" />
      </a>
      <a
        :href="MCP_DOCS_CONFIGURATION_URL"
        target="_blank"
        rel="noopener"
        class="docs-link"
      >
        <font-awesome-icon :icon="['fas', 'book']" />
        {{ $t('MCP configuration guide') }}
        <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="docs-link-icon" />
      </a>
      <a
        :href="MCP_DOCS_CLIENTS_URL"
        target="_blank"
        rel="noopener"
        class="docs-link"
      >
        <font-awesome-icon :icon="['fas', 'book']" />
        {{ $t('MCP client setup') }}
        <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="docs-link-icon" />
      </a>
    </nav>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import {
  MCP_DOCS_BASE_URL,
  MCP_DOCS_CLIENTS_URL,
  MCP_DOCS_CONFIGURATION_URL,
} from '@qelos/global-types';
import { getMcpAdminEndpointUrl } from '../services/mcp-endpoint';

const props = withDefaults(
  defineProps<{
    variant?: 'full' | 'compact';
    showDocsLinks?: boolean;
    muted?: boolean;
  }>(),
  {
    variant: 'full',
    muted: false,
  },
);

const { t } = useI18n();

const endpointUrl = computed(() => getMcpAdminEndpointUrl());

const docsLinksVisible = computed(
  () => props.showDocsLinks ?? props.variant === 'full',
);

async function copyEndpointUrl() {
  if (!endpointUrl.value) return;

  await navigator.clipboard?.writeText(endpointUrl.value);
  ElMessage.success(t('Copied to clipboard'));
}
</script>

<style scoped lang="scss">
.mcp-endpoint-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mcp-endpoint-panel--muted {
  opacity: 0.85;
}

.endpoint-header {
  margin-block-end: 4px;
}

.panel-eyebrow {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin: 0;
  font-weight: 600;
}

.endpoint-heading {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.endpoint-box {
  background-color: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.endpoint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.endpoint-helper {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.endpoint-input :deep(.el-input__inner) {
  word-break: break-all;
}

.docs-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.docs-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--main-color, var(--el-color-primary));
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(var(--main-color-rgb, 64, 158, 255), 0.08);
  }
}

.docs-link-icon {
  font-size: 12px;
  opacity: 0.75;
}

.mcp-endpoint-panel--compact {
  gap: 12px;

  .endpoint-box {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .endpoint-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .endpoint-input {
    width: 100%;
  }

  .docs-links {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
