<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    @command="handleSourceSelect"
    :disabled="disabled"
  >
    <el-button
      type="primary"
      :size="size"
      :loading="loading"
      :disabled="disabled"
      class="ai-generate-button"
    >
      <el-icon class="mr-1">
        <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" />
      </el-icon>
      <el-icon class="ml-1 el-icon--right">
        <ArrowDown />
      </el-icon>
    </el-button>
    
    <template #dropdown>
      <el-dropdown-menu class="ai-source-menu">
        <div class="menu-header">
          <span>Generate with AI</span>
        </div>
        <el-dropdown-item
          v-for="source in aiSources"
          :key="source._id"
          :command="source._id"
          class="source-item"
        >
          <div class="source-content">
            <img
              v-if="getKindLogo(source.kind)"
              :src="getKindLogo(source.kind)"
              :alt="source.name"
              class="source-icon"
            />
            <div class="source-info">
              <div class="source-name">{{ source.name }}</div>
              <div class="source-kind">{{ source.kind }}</div>
            </div>
          </div>
        </el-dropdown-item>
        <el-dropdown-item
          v-if="!aiSources.length"
          disabled
          class="no-sources"
        >
          <div class="no-sources-content">
            <el-icon><Warning /></el-icon>
            <span>No AI sources configured</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, Warning } from '@element-plus/icons-vue'
import { useAskAdminAi } from '../store/ask-admin-ai'
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds'
import { IntegrationSourceKind } from '@qelos/global-types'

interface Props {
  prompt: string | (() => Promise<string> | string | Promise<{ prompt: string; schema?: any }> | { prompt: string; schema?: any })
  schema?: any | string
  size?: 'large' | 'default' | 'small'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  disabled: false
})

const emit = defineEmits<{
  result: [data: any]
  error: [error: any]
}>()

const loading = ref(false)

const askAdminAiStore = useAskAdminAi()
const aiSources = computed(() => askAdminAiStore.aiSources)
const integrationKinds = useIntegrationKinds()

function getKindLogo(kind: IntegrationSourceKind) {
  return integrationKinds[kind]?.logo
}

async function handleSourceSelect(sourceId: string) {
  if (!sourceId) {
    ElMessage.warning('Please select an AI source')
    return
  }

  loading.value = true
  
  try {
    let finalPrompt = ''
    let finalSchema = props.schema

    // Check if prompt is a function
    if (typeof props.prompt === 'function') {
      const result = await props.prompt()
      
      if (typeof result === 'string') {
        finalPrompt = result
      } else if (typeof result === 'object' && result !== null) {
        finalPrompt = result.prompt
        if (result.schema !== undefined) {
          finalSchema = result.schema
        }
      }
    } else {
      finalPrompt = props.prompt
    }

    if (!finalPrompt) {
      ElMessage.warning('No prompt provided')
      return
    }

    const response = await askAdminAiStore.askAiJson(sourceId, finalPrompt, finalSchema)
    emit('result', response)
    ElMessage.success('AI generation completed')
    
  } catch (error) {
    console.error('AI prompt error:', error)
    ElMessage.error('Failed to get AI response')
    emit('error', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.ai-generate-button {
  transition: all 0.3s ease;
}

.ai-source-menu {
  min-width: 280px;
  padding: 8px 0;
}

.menu-header {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
}

.source-item {
  padding: 0;
  line-height: normal;
}

.source-item:hover {
  background-color: var(--el-fill-color-light);
}

.source-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.source-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-kind {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.no-sources {
  padding: 0;
}

.no-sources-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.mr-1 {
  margin-right: 0.25rem;
}

.ml-1 {
  margin-left: 0.25rem;
}
</style>
