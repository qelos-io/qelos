<template>
  <div class="component-form">
    <div class="mode-toggle-container">
      <el-switch
        v-model="fileUploaded"
        class="toggle-switch"
        active-text="Editor Mode"
        inactive-text="Upload Mode"
        inline-prompt
        :active-icon="Edit"
        :inactive-icon="Upload"
      />
    </div>

    <div v-if="!fileUploaded">
      <div 
        class="file-drop-zone" 
        :class="{ 'is-active': isDragging }" 
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleFileDrop"
        @click="triggerFileInput"
      >
        <input 
          type="file" 
          ref="fileInput" 
          accept=".vue" 
          style="display: none;" 
          @change="handleFileSelect"
        />
        <el-icon><Upload /></el-icon>
        <div class="drop-text">
          <h3>Upload Vue File</h3>
          <p>Drop a .vue file here or click to browse</p>
        </div>
      </div>
    </div>
    
    <div v-if="fileUploaded" class="uploaded-file-container">
      <div class="uploaded-file-header">
        <h3>{{ uploadedFileName }}</h3>
        <el-button type="text" @click="handleReupload">
          <el-icon><RefreshRight /></el-icon>
          Re-upload
        </el-button>
      </div>
      <div class="uploaded-file-content">
        <Monaco
          v-model="uploadedFileContent"
          language="html"
        />
      </div>
    </div>
    
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Component Name" prop="componentName">
        <el-input 
          v-model="form.componentName" 
          placeholder="Enter component name"
          :disabled="loading"
        />
      </el-form-item>
      
      <el-form-item label="Identifier" prop="identifier">
        <el-input 
          v-model="form.identifier" 
          placeholder="Enter component identifier (must be unique)"
          :disabled="loading"
        />
        <div class="form-hint">
          This identifier will be used to reference the component in your code.
        </div>
      </el-form-item>
      
      <el-form-item label="Description" prop="description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3"
          placeholder="Enter component description"
          :disabled="loading"
        />
      </el-form-item>
      <el-form-item>
        <el-button 
          type="primary" 
          native-type="submit"
          :loading="loading"
        >
          {{ initialData ? 'Update Component' : 'Create Component' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, capitalize } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, RefreshRight, Edit } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue'
import { useVueFileTemplate } from '../compositions/vue-file-template';

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submitted', 'cancel']);

const { defaultVueTemplate } = useVueFileTemplate();

const formRef = ref();
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const fileUploaded = ref(false);
const uploadedFileName = ref('');
const uploadedFileContent = ref(defaultVueTemplate);

const form = reactive({
  componentName: '',
  identifier: '',
  description: ''
});

const rules = {
  componentName: [
    { required: true, message: 'Component name is required', trigger: 'blur' }
  ],
  identifier: [
    { required: true, message: 'Identifier is required', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9-]+$/, message: 'Identifier can only contain letters, numbers, and hyphens (no spaces or special characters)', trigger: 'blur' }
  ],
  description: [
    { required: false, trigger: 'blur' }
  ]
};

// Initialize form with initial data if provided
watch(() => props.initialData, (newVal) => {
  if (newVal) {
    form.componentName = newVal.componentName || '';
    form.identifier = newVal.identifier || '';
    form.description = newVal.description || '';
    uploadedFileContent.value = newVal.content || defaultVueTemplate;
    uploadedFileName.value = newVal.componentName;
    if (newVal.content) {
      fileUploaded.value = true;
    }
  }
}, { immediate: true });

// Generate identifier from component name
watch(() => form.componentName, (newVal) => {
  if (newVal && !form.identifier) {
    form.identifier = newVal
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    emit('submitted', {
      componentName: form.componentName,
      identifier: form.identifier,
      description: form.description,
      content: uploadedFileContent.value
    });
    uploadedFileName.value = form.componentName;
  } catch (error) {
    console.error('Form validation failed:', error);
  }
};

const handleDragOver = (event: DragEvent) => {
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  isDragging.value = false;
};

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false;
  
  if (!event.dataTransfer?.files.length) return;
  
  const file = event.dataTransfer.files[0];
  
  if (file.name.endsWith('.vue')) {
    processVueFile(file);
  } else {
    ElMessage.error('Please drop a valid .vue file');
  }
};

const processVueFile = (file: File) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (content) {
      // Extract component info from file content and name
      extractComponentInfo(content, file.name);
      
      // Store file information for display
      uploadedFileName.value = file.name;
      uploadedFileContent.value = content;
      fileUploaded.value = true;
      
      ElMessage.success(`File ${file.name} loaded successfully`);
    } else {
      ElMessage.warning('Could not read file content');
    }
  };
  
  reader.onerror = () => {
    ElMessage.error('Error reading file');
  };
  
  reader.readAsText(file);
};

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const handleReupload = () => {
  fileUploaded.value = false;
  uploadedFileName.value = '';
  uploadedFileContent.value = '';
  form.componentName = '';
  form.description = '';
  form.identifier = '';
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    const file = target.files[0];
    if (file.name.endsWith('.vue')) {
      processVueFile(file);
    } else {
      ElMessage.error('Please select a valid .vue file');
    }
    // Reset the file input so the same file can be selected again if needed
    target.value = '';
  }
};

// Extract component name and identifier from Vue file content and filename
const extractComponentInfo = (content: string, fileName: string) => {
  // Try to extract component name from script section
  const nameMatch = content.match(/name:\s*['"](.*?)['"]/);
  
  form.componentName = capitalize(fileName.replace(/\.vue$/, ''));
  
  // Generate identifier from component name or file name
  form.identifier = (form.componentName || fileName.replace(/\.vue$/, ''))
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  
  // Extract description from comments if available
  const descriptionMatch = content.match(/\/\*\*\s*(.*?)\s*\*\/|\<!--\s*(.*?)\s*--\>/s);
  if (descriptionMatch) {
    const description = (descriptionMatch[1] || descriptionMatch[2] || '')
      .replace(/\*/g, '')
      .replace(/\n/g, ' ')
      .trim();
    if (description) {
      form.description = description;
    } else {
      // Use component name as fallback description
      form.description = `${form.componentName} component`;
    }
  } else {
    // Use component name as fallback description
    form.description = `${form.componentName} component`;
  }
};
</script>

<style scoped>
.component-form {
  max-width: 100%;
}

.mode-toggle-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.toggle-switch :deep(.el-switch__label) {
  font-size: 14px;
}

.editor-container {
  height: 500px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-block-start: 4px;
}

.file-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 30px;
  margin-block-end: 20px;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-drop-zone.is-active {
  border-color: var(--el-color-primary);
  background-color: rgba(var(--el-color-primary-rgb), 0.1);
}

.uploaded-file-container {
  margin-block-end: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.uploaded-file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.uploaded-file-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.uploaded-file-content {
  max-height: 350px;
  overflow: auto;
  padding: 10px;
  background-color: #f8f9fa;
}

.file-drop-zone .el-icon {
  font-size: 48px;
  color: #909399;
  margin-block-end: 16px;
}

.file-drop-zone.is-active .el-icon {
  color: var(--el-color-primary);
}

.drop-text h3 {
  font-size: 18px;
  margin: 0 0 8px;
  color: #606266;
}

.drop-text p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}
</style>
