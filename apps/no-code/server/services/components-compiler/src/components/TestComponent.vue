<template>
  <div class="video-upload-beautiful">
    <el-upload
      class="upload-area"
      drag
      action="/api/upload"
      :accept="'video/*'"
      :limit="1"
      :show-file-list="false"
      :on-success="handleSuccess"
      :on-error="handleError"
      :before-upload="beforeUpload"
      :on-progress="handleProgress"
    >
      <i class="el-icon-video-camera upload-icon"></i>
      <div class="el-upload__text">
        <span v-if="!isUploading">Drop video here or <em>click to upload</em></span>
        <span v-else>Uploading... {{ uploadPercent }}%</span>
      </div>
    </el-upload>
    <el-progress
      v-if="isUploading"
      :percentage="uploadPercent"
      :status="uploadError ? 'exception' : 'success'"
      style="margin-top: 16px"
    ></el-progress>
    <el-alert v-if="uploadError" type="error" :closable="false" show-icon style="margin-top: 12px">
      {{ uploadError }}
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['upload-success'])

const isUploading = ref(false)
const uploadPercent = ref(0)
const uploadError = ref('')

function beforeUpload(file) {
  uploadError.value = ''
  if (!file.type.startsWith('video/')) {
    uploadError.value = 'You can only upload video files!'
    return false
  }
  isUploading.value = true
  uploadPercent.value = 0
  return true
}

function handleProgress(event) {
  uploadPercent.value = Math.round(event.percent)
}

function handleSuccess(response, file) {
  isUploading.value = false
  uploadPercent.value = 100
  uploadError.value = ''
  ElMessage.success('Video uploaded successfully!')
  emit('upload-success', response)
}

function handleError(err) {
  isUploading.value = false
  uploadPercent.value = 0
  uploadError.value = err?.msg || 'Upload failed. Please try again.'
}
</script>

<style scoped>
.video-upload-beautiful {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 38px 18px;
  background: linear-gradient(130deg, #e0e7ff 0%, #fff7ed 100%);
  border-radius: 24px;
  box-shadow: 0 4px 24px 0 rgba(80, 154, 245, 0.08);
  max-width: 420px;
  margin: 0 auto;
}

.upload-area {
  width: 100%;
  border: 2px dashed #8ac6f2;
  background: #f7fafc;
  border-radius: 18px;
  transition: background 0.3s;
}

.upload-area:hover {
  background: #e5f6ff;
  border-color: #409eff;
}

.upload-icon {
  font-size: 38px;
  color: #409eff;
  margin-bottom: 8px;
}

.el-upload__text {
  font-size: 15px;
  color: #3b3b3b;
}
</style>