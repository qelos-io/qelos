<template>
  <el-form class="block-form" @submit.native.prevent="submit">
    <div class="form-header">
      <div class="tabs-container">
        <div class="tab-button" :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">
          Basic Information
        </div>
        <div class="tab-button" :class="{ active: activeTab === 'content' }" @click="activeTab = 'content'">
          Content
        </div>
      </div>
      
      <div class="form-actions">
        <el-tooltip content="Toggle preview mode" placement="top">
          <el-button 
            type="primary" 
            :icon="showPreview ? 'icon-view' : 'icon-hide'" 
            @click="togglePreviewMode" 
            size="small"
            circle
          />
        </el-tooltip>
        <SaveButton :submitting="submitting" />
      </div>
    </div>

    <div class="block-snippet">
      <div class="snippet-header">
        <div class="snippet-title">Embed this content box</div>
        <div class="snippet-description">Copy and paste into any page or component.</div>
      </div>
      <div class="snippet-body">
        <pre class="snippet-code" dir="ltr">{{ embedSnippet }}</pre>
        <el-button
          type="primary"
          plain
          size="small"
          :icon="'icon-document-copy'"
          @click="copySnippet"
        >
          Copy
        </el-button>
      </div>
    </div>
    
    <!-- Basic Information Tab -->
    <div v-if="activeTab === 'basic'" class="tab-content">
      <div class="form-section">
        <FormInput
          title="Name"
          v-model="name"
          placeholder="Enter a name for this content box"
          required
        />
        <FormInput
          title="Description"
          v-model="description"
          type="textarea"
          :rows="3"
          placeholder="Enter a description for this content box"
        />
      </div>
    </div>
    
    <!-- Content Tab -->
    <div v-if="activeTab === 'content'" class="tab-content">
      <div class="content-container" :class="{ 'split-mode': splitView }">
        <div class="editor-container" :class="{ 'full-width': !showPreview }">
          <div class="editor-toolbar">
            <el-tooltip content="Toggle split view" placement="top">
              <el-button 
                :icon="splitView ? 'icon-fold' : 'icon-expand'" 
                @click="splitView = !splitView" 
                size="small"
                circle
              />
            </el-tooltip>
          </div>
          <WysiwygEditor 
            v-model="content"
            :language="editorConfig.language"
          />
        </div>
        
        <div class="preview-container" :class="{ 'full-width': splitView, 'hidden': !showPreview }">
          <div class="preview-header">
            <span>Preview</span>
            <el-tooltip content="Refresh preview" placement="top">
              <el-button 
                icon="icon-refresh-right" 
                @click="refreshPreview" 
                size="small"
                circle
              />
            </el-tooltip>
          </div>
          <div class="preview-content">
            <ErrorBoundary>
              <RuntimeTemplate :template="content" :key="previewKey"/>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormInput from '../../core/components/forms/FormInput.vue'
import { clearNulls } from '../../core/utils/clear-nulls'
import { useBlockForm } from '../compositions/blocks'
import { useEditorConfig } from '../compositions/editor-config'
import { useUnsavedChanges } from '../../drafts/compositions/unsaved-changes'
import { IBlock } from '../../../services/types/block';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import RuntimeTemplate from '@/modules/core/components/layout/RuntimeTemplate.vue';
import ErrorBoundary from '@/modules/core/components/ErrorBoundary.vue';
import WysiwygEditor from './WysiwygEditor.vue';

const props = defineProps({
  block: Object as () => IBlock,
  submitting: Boolean
})

const emit = defineEmits(['submitted'])

const { editedBlock, name, content, description } = useBlockForm(props)
const { editorConfig } = useEditorConfig()

useUnsavedChanges('block', props.block?._id, computed(() => props.block?.name), editedBlock)

const snippetPlaceholder = '[PUT_THE_ID_HERE]'
const embedSnippet = computed(() => `<content-box identifier="${props.block?._id || snippetPlaceholder}"></content-box>`)

// UI state management
const activeTab = ref(props.block?._id ? 'content' : 'basic')
const splitView = ref(false)
const showPreview = ref(true)
const previewKey = ref(0)

// Refresh preview to update content
const refreshPreview = () => {
  previewKey.value++
}

// Toggle between edit and preview modes
const togglePreviewMode = () => {
  showPreview.value = !showPreview.value
  if (showPreview.value) {
    refreshPreview()
  }
}

// Auto-refresh preview when content changes
watch(content, () => {
  if (activeTab.value === 'content' && showPreview.value) {
    // Use setTimeout to avoid too frequent refreshes during typing
    setTimeout(() => refreshPreview(), 500)
  }
}, { deep: true })

const copySnippet = async () => {
  try {
    await navigator.clipboard.writeText(embedSnippet.value)
    ElMessage.success('Embed code copied')
  } catch (error) {
    console.error('Failed to copy embed snippet', error)
    ElMessage.error('Unable to copy embed code')
  }
}

const submit = () => {
  if (!name.value) {
    activeTab.value = 'basic'
    return
  }
  emit('submitted', clearNulls(editedBlock))
}
</script>
<style scoped>
.block-form {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.block-snippet {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  background-color: var(--el-fill-color-light);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snippet-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.snippet-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.snippet-description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.snippet-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.snippet-code {
  flex: 1;
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: var(--font-family-mono, 'SFMono-Regular', 'Roboto Mono', monospace);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tabs-container {
  display: flex;
  gap: 8px;
}

.tab-button {
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--el-text-color-secondary);
  transition: all 0.3s;
}

.tab-button.active {
  border-bottom: 2px solid var(--el-color-primary);
  color: var(--el-color-primary);
  font-weight: 500;
}

.tab-button:hover:not(.active) {
  color: var(--el-text-color-primary);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.tab-content {
  padding: 16px 0;
}

.form-section {
  max-width: 800px;
}

.content-container {
  display: flex;
  height: calc(100vh - 250px);
  min-height: 400px;
  gap: 16px;
  border-radius: 4px;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.editor-container.full-width {
  width: 100%;
}

.editor-container.hidden {
  display: none;
}

.editor-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background-color: white;
}

.preview-container.full-width {
  flex: 1;
}

.preview-container.hidden {
  display: none;
}

.split-mode .editor-container,
.split-mode .preview-container {
  flex: 1;
  max-width: 50%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  font-weight: 500;
}

.preview-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

:deep(.ck-editor) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.ck-editor__main) {
  flex: 1;
  overflow: auto;
}

:deep(.ck-editor .ck-editor__editable) {
  min-height: 100%;
  height: 100%;
}
</style>
