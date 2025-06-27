<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import { ElMessage } from 'element-plus'
import AssetUploader from '@/modules/assets/components/AssetUploader.vue'
import Monaco from '@/modules/users/components/Monaco.vue'

const model = defineModel<string>();
const props = defineProps<{ language?: string, placeholder?: string, readonly?: boolean }>();

const editor = ref<Editor | null>(null)
const isEditorReady = ref(false)
const isHtmlMode = ref(false)

// Monaco editor reference
const monacoEditor = ref(null)

// Setup Monaco editor change event
const setupMonacoChangeEvent = () => {
  setTimeout(() => {
    const monacoInstance = monacoEditor.value?.getMonaco()
    if (monacoInstance) {
      // Add change event listener to Monaco editor
      monacoInstance.onDidChangeModelContent(() => {
        // Update model directly from Monaco editor
        model.value = monacoInstance.getValue() || ''
      })
    }
  }, 100)
}

// Toggle between WYSIWYG and HTML source code modes
const toggleHtmlMode = () => {
  if (isHtmlMode.value) {
    // Switch from HTML to WYSIWYG mode
    if (editor.value) {
      try {
        // The model value is already updated by Monaco's change event
        editor.value.commands.setContent(model.value || '')
      } catch (error) {
        ElMessage.error('Invalid HTML. Please check your code.')
        return // Don't toggle if HTML is invalid
      }
    }
  } else {
    // Switch from WYSIWYG to HTML mode
    // Need to wait for Monaco to be mounted before setting value
    setTimeout(() => {
      if (monacoEditor.value) {
        monacoEditor.value.updateValue(model.value || '')
        // Setup Monaco change event after switching to HTML mode
        setupMonacoChangeEvent()
      }
    }, 100)
  }
  isHtmlMode.value = !isHtmlMode.value
}

// Initialize the editor with the model value
onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        inline: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'wysiwyg-link',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Color,
      Highlight,
      TextStyle,
    ],
    content: model.value || '',
    editable: !props.readonly,
    onUpdate: ({ editor }) => {
      // Update the model when the content changes
      model.value = editor.getHTML()
    },
    editorProps: {
      attributes: {
        class: 'wysiwyg-editor-content',
        ...(props.placeholder ? { 'data-placeholder': props.placeholder } : {}),
      },
    },
  })
  
  isEditorReady.value = true
})

// Watch for changes in the model value
watch(() => model.value, (newValue) => {
  // Only update if the editor exists and the content is different
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue || '', false)
  }
}, { deep: true })

// Clean up the editor on component unmount
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

// Dialog states
const showLinkDialog = ref(false)
const showImageDialog = ref(false)
const showTableDialog = ref(false)
// No inline styles feature

// Form models
const linkForm = ref({
  url: '',
  text: '',
  openInNewTab: true
})

const imageForm = ref({
  url: '',
  alt: '',
  title: ''
})

const uploadLoading = ref(false)

const tableForm = ref({
  rows: 3,
  cols: 3,
  withHeaderRow: true
})

// Helper functions for the editor toolbar
const setLink = () => {
  // Check if we're editing an existing link
  if (editor.value?.isActive('link')) {
    const attrs = editor.value.getAttributes('link')
    linkForm.value.url = attrs.href || ''
    linkForm.value.openInNewTab = attrs.target === '_blank'
    // Try to get the selected text
    linkForm.value.text = editor.value.state.selection.content().content.firstChild?.text || ''
  } else {
    // New link - get selected text
    linkForm.value.text = editor.value?.state.selection.content().content.firstChild?.text || ''
    linkForm.value.url = ''
    linkForm.value.openInNewTab = true
  }
  
  showLinkDialog.value = true
}

const applyLink = () => {
  if (!linkForm.value.url) {
    // If URL is empty, remove the link
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  } else {
    // Apply the link with attributes
    editor.value?.chain().focus().extendMarkRange('link').setLink({
      href: linkForm.value.url,
      target: linkForm.value.openInNewTab ? '_blank' : null,
      rel: linkForm.value.openInNewTab ? 'noopener noreferrer' : null,
    }).run()
  }
  
  showLinkDialog.value = false
}

const removeLink = () => {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  showLinkDialog.value = false
}

// Color related states
const showColorPicker = ref(false)
const currentColor = ref('#000000')
const colorPickerMode = ref<'text' | 'highlight'>('text')

const setTextColor = () => {
  colorPickerMode.value = 'text'
  currentColor.value = '#000000'
  showColorPicker.value = true
}

const setHighlightColor = () => {
  colorPickerMode.value = 'highlight'
  currentColor.value = '#FFFF00'
  showColorPicker.value = true
}

const applyColor = () => {
  if (colorPickerMode.value === 'text') {
    editor.value?.chain().focus().setColor(currentColor.value).run()
  } else {
    editor.value?.chain().focus().setHighlight({ color: currentColor.value }).run()
  }
  showColorPicker.value = false
}

// Inline styles feature has been removed

const addImage = () => {
  imageForm.value = {
    url: '',
    alt: '',
    title: ''
  }
  showImageDialog.value = true
}

const handleAssetUpload = (imageUrl: string) => {
  if (imageUrl) {
    imageForm.value.url = imageUrl
  }
}

const insertImage = () => {
  if (imageForm.value.url) {
    // Use the URL directly
    editor.value?.chain().focus().setImage({
      src: imageForm.value.url,
      alt: imageForm.value.alt,
      title: imageForm.value.title,
    }).run()
    showImageDialog.value = false
  } else {
    ElMessage.warning('Please provide an image URL')
  }
}

const addTable = () => {
  tableForm.value = {
    rows: 3,
    cols: 3,
    withHeaderRow: true
  }
  showTableDialog.value = true
}

const insertTable = () => {
  editor.value?.chain().focus().insertTable({
    rows: tableForm.value.rows,
    cols: tableForm.value.cols,
    withHeaderRow: tableForm.value.withHeaderRow
  }).run()
  showTableDialog.value = false
}

// Handle file drop for images
const handleDrop = (event: DragEvent) => {
  if (!editor.value || !event.dataTransfer?.files.length) return
  
  const file = event.dataTransfer.files[0]
  if (!file.type.startsWith('image/')) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    if (typeof e.target?.result === 'string') {
      editor.value?.chain().focus().setImage({ src: e.target.result }).run()
    }
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="wysiwyg-editor" :class="{ 'readonly': props.readonly }">
    <!-- Toggle HTML/WYSIWYG Button -->
    <div v-if="isEditorReady && !props.readonly" class="mode-toggle-container">
      <el-button 
        type="primary" 
        size="small" 
        @click="toggleHtmlMode"
        :icon="isHtmlMode ? 'View' : 'Edit'"
      >
        {{ isHtmlMode ? 'Visual Editor' : 'HTML Source' }}
      </el-button>
    </div>
    
    <!-- HTML Source Editor (Monaco) -->
    <div v-if="isHtmlMode" class="html-source-editor">
      <Monaco
        ref="monacoEditor"
        v-model="model"
        language="html"
      />
    </div>
    
    <!-- WYSIWYG Editor with Toolbar -->
    <div v-if="!isHtmlMode" class="wysiwyg-container">
      <!-- Editor Toolbar -->
      <div v-if="isEditorReady && !props.readonly" class="wysiwyg-toolbar">
        <div class="toolbar-group">
          <button 
            type="button"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
            :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
            title="Heading 1"
          >
            H1
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
            :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
            title="Heading 2"
          >
            H2
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
            :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
            title="Heading 3"
          >
            H3
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().setParagraph().run()"
            :class="{ 'is-active': editor?.isActive('paragraph') }"
            title="Paragraph"
          >
            P
          </button>
        </div>

        <div class="toolbar-group">
          <button 
            type="button"
            @click="editor?.chain().focus().toggleBold().run()"
            :class="{ 'is-active': editor?.isActive('bold') }"
            title="Bold"
          >
            <i class="el-icon-bold">B</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleItalic().run()"
            :class="{ 'is-active': editor?.isActive('italic') }"
            title="Italic"
          >
            <i class="el-icon-italic">I</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleUnderline().run()"
            :class="{ 'is-active': editor?.isActive('underline') }"
            title="Underline"
          >
            <i class="el-icon-underline">U</i>
          </button>
          <button     
            type="button"
            @click="editor?.chain().focus().toggleStrike().run()"
            :class="{ 'is-active': editor?.isActive('strike') }"
            title="Strike"
          >
            <i class="el-icon-strikethrough">S</i>
          </button>
          <button
            type="button"
            @click="setTextColor"
            title="Text Color"
          >
            <i class="el-icon-brush" style="color: #409eff;">A</i>
          </button>
          <button
            type="button"
            @click="setHighlightColor"
            title="Highlight Color"
          >
            <i class="el-icon-brush" style="background-color: #FFFF00; padding: 0 2px;">H</i>
          </button>
        </div>

        <div class="toolbar-group">
          <button 
            type="button"
            @click="editor?.chain().focus().toggleBulletList().run()"
            :class="{ 'is-active': editor?.isActive('bulletList') }"
            title="Bullet List"
          >
            <i class="el-icon-list-ul">•</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleOrderedList().run()"
            :class="{ 'is-active': editor?.isActive('orderedList') }"
            title="Ordered List"
          >
            <i class="el-icon-list-ol">1.</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
            :class="{ 'is-active': editor?.isActive('codeBlock') }"
            title="Code Block"
          >
            <i class="el-icon-code">{}</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().toggleBlockquote().run()"
            :class="{ 'is-active': editor?.isActive('blockquote') }"
            title="Blockquote"
          >
            <i class="el-icon-quote-right">"</i>
          </button>
        </div>

        <div class="toolbar-group">
          <button 
            type="button"
            @click="setLink"
            :class="{ 'is-active': editor?.isActive('link') }"
            title="Link"
          >
            <i class="el-icon-link">🔗</i>
          </button>
          <button 
            type="button"
            @click="addImage"
            title="Image"
          >
            <i class="el-icon-picture">🖼️</i>
          </button>
          <button 
            type="button"
            @click="addTable"
            title="Table"
          >
            <i class="el-icon-table">📊</i>
          </button>
          <!-- Inline styles button removed -->
        </div>

        <div class="toolbar-group">
          <button 
            type="button"
            @click="editor?.chain().focus().setTextAlign('left').run()"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
            title="Align Left"
          >
            <i class="el-icon-align-left">⬅️</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().setTextAlign('center').run()"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
            title="Align Center"
          >
            <i class="el-icon-align-center">⬆️</i>
          </button>
          <button 
            type="button"
            @click="editor?.chain().focus().setTextAlign('right').run()"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
            title="Align Right"
          >
            <i class="el-icon-align-right">➡️</i>
          </button>
        </div>
      </div>
      
      <!-- Editor Content -->
      <div class="editor-container" @drop="handleDrop" @dragover.prevent>
        <editor-content v-if="editor" :editor="editor" />
      </div>
    </div>
    
    <!-- Link Dialog -->
    <el-dialog
      v-model="showLinkDialog"
      title="Insert Link"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
    >
      <el-form :model="linkForm" label-position="top">
        <el-form-item label="URL">
          <el-input v-model="linkForm.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="Text" v-if="linkForm.text">
          <el-input v-model="linkForm.text" placeholder="Link text" disabled />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="linkForm.openInNewTab">Open in new tab</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showLinkDialog = false">Cancel</el-button>
          <el-button v-if="editor?.isActive('link')" type="danger" @click="removeLink">Remove Link</el-button>
          <el-button type="primary" @click="applyLink">Apply</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- Image Dialog -->
    <el-dialog
      v-model="showImageDialog"
      title="Insert Image"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
    >
      <div class="image-upload-container">
        <AssetUploader
          :value="imageForm.url"
          @change="handleAssetUpload"
          :upload-config="{
            header: 'Upload Image',
            subheader: 'Upload an image to insert into your content',
            mainText: 'Drop image here or',
            secondaryText: 'click to upload'
          }"
        />
        
        <div v-if="imageForm.url" class="manual-url-section">
          <el-divider>Or enter URL manually</el-divider>
          <el-form :model="imageForm" label-position="top">
            <el-form-item label="Image URL">
              <el-input v-model="imageForm.url" placeholder="https://example.com/image.jpg" />
            </el-form-item>
          </el-form>
        </div>
      </div>
      
      <el-form :model="imageForm" label-position="top">
        <el-form-item label="Alt Text">
          <el-input v-model="imageForm.alt" placeholder="Alternative text for accessibility" />
        </el-form-item>
        <el-form-item label="Title">
          <el-input v-model="imageForm.title" placeholder="Image title (shows on hover)" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImageDialog = false">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="insertImage" 
            :disabled="!imageForm.url"
          >
            Insert
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- Color Picker Dialog -->
    <el-dialog
      v-model="showColorPicker"
      :title="colorPickerMode === 'text' ? 'Text Color' : 'Highlight Color'"
      width="300px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
    >
      <el-color-picker v-model="currentColor" show-alpha></el-color-picker>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showColorPicker = false">Cancel</el-button>
          <el-button type="primary" @click="applyColor">Apply</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- Inline Style Dialog removed -->
    
    <!-- Table Dialog -->
    <el-dialog
      v-model="showTableDialog"
      title="Insert Table"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
    >
      <el-form :model="tableForm" label-position="top">
        <el-form-item label="Rows">
          <el-input-number v-model="tableForm.rows" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="Columns">
          <el-input-number v-model="tableForm.cols" :min="1" :max="10" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="tableForm.withHeaderRow">Include header row</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTableDialog = false">Cancel</el-button>
          <el-button type="primary" @click="insertTable">Insert</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.wysiwyg-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.wysiwyg-editor.readonly {
  border: none;
}

.wysiwyg-toolbar {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  border-right: 1px solid #dcdfe6;
  padding-right: 8px;
  margin-right: 8px;
}

.toolbar-group:last-child {
  border-right: none;
}

.wysiwyg-toolbar button {
  border: 1px solid transparent;
  background: none;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 0 2px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.wysiwyg-toolbar button:hover {
  background-color: #ecf5ff;
  border-color: #c6e2ff;
}

.wysiwyg-toolbar button.is-active {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.mode-toggle-container {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.wysiwyg-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.editor-container {
  padding: 16px;
  flex-grow: 1;
  min-height: 200px;
  overflow-y: auto;
}

.html-source-editor {
  height: 100%;
  min-height: 400px;
  border-top: 1px solid #dcdfe6;
}

.html-source-editor :deep(.monaco) {
  height: 100%;
  min-height: 400px;
  margin-bottom: 0;
}

/* Image upload container styles */
.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.manual-url-section {
  margin-top: 10px;
}

.image-upload-container :deep(.asset-view img) {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

/* Dialog styles */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* Editor content styles */
.wysiwyg-editor-content {
  outline: none;
}

.wysiwyg-editor-content p {
  margin: 0.75em 0;
}

.wysiwyg-editor-content h1,
.wysiwyg-editor-content h2,
.wysiwyg-editor-content h3,
.wysiwyg-editor-content h4,
.wysiwyg-editor-content h5,
.wysiwyg-editor-content h6 {
  margin: 1em 0 0.5em;
  line-height: 1.2;
}

.wysiwyg-editor-content h1 {
  font-size: 2em;
}

.wysiwyg-editor-content h2 {
  font-size: 1.5em;
}

.wysiwyg-editor-content h3 {
  font-size: 1.17em;
}

.wysiwyg-editor-content ul,
.wysiwyg-editor-content ol {
  padding-left: 2em;
}

.wysiwyg-editor-content blockquote {
  border-left: 3px solid #dcdfe6;
  padding-left: 1em;
  margin-left: 0;
  color: #606266;
  background-color: #f8f8f8;
  padding: 0.5em 1em;
}

.wysiwyg-editor-content pre {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 0.75em 1em;
  overflow-x: auto;
  font-family: monospace;
}

.wysiwyg-editor-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.wysiwyg-editor-content table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1em 0;
  overflow: hidden;
}

.wysiwyg-editor-content table td,
.wysiwyg-editor-content table th {
  border: 1px solid #dcdfe6;
  padding: 0.5em;
  position: relative;
  vertical-align: top;
}

.wysiwyg-editor-content table th {
  background-color: #f5f7fa;
  font-weight: bold;
}

.wysiwyg-editor-content a {
  color: #409eff;
  text-decoration: underline;
}

.wysiwyg-editor-content a:hover {
  text-decoration: none;
}

/* Placeholder text */
.wysiwyg-editor-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #aaa;
  pointer-events: none;
  height: 0;
}

/* Color styles */
.wysiwyg-editor-content [style*="color:"] {
  border-bottom: 1px dotted;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .wysiwyg-toolbar {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .toolbar-group {
    margin-bottom: 8px;
  }
}
</style>