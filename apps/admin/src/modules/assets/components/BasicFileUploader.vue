<template>
  <div class="basic-file-uploader">
    <el-upload class="uploader" drag :headers="headers" :action="uploadUrl" :with-credentials="withCredentials"
      :on-success="onSuccess" :on-error="onError" :before-upload="beforeUpload">
      <div v-if="header" class="uploader-header-container">
        <h4>{{ header }}</h4>
        <p v-if="subheader">{{ subheader }}</p>
      </div>

      <div class="uploader-icon-container">
        <img v-if="iconUrl" :src="iconUrl" class="custom-icon" alt="" />
        <el-icon v-else class="default-icon">
          <font-awesome-icon :icon="['fas', 'cloud-arrow-up']" />
        </el-icon>
      </div>

      <div class="el-upload__text">
        <p>{{ mainText ?? $t('Drop file here or ') }}</p>
        <em>{{ secondaryText ?? $t('click to upload') }}</em>
      </div>
    </el-upload>
  </div>
</template>
<script lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useAssetsUpload } from '../compositions/assets'

export default {
  name: 'BasicFileUploader',
  props: {
    storage: String,

    // UI Design props
    header: String,
    subheader: String,
    iconUrl: String,
    mainText: String,
    secondaryText: String
  },
  emits: ['upload'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const location = ref('')
    const { headers, uploadUrl, setUploadUrl, withCredentials } = useAssetsUpload(
      props.storage,
      location
    )

    return {
      headers,
      withCredentials,
      uploadUrl,
      beforeUpload: (file) => {
        setUploadUrl(file)
        return nextTick()
      },
      location,
      onSuccess(res) {
        ElMessage.success(t('File uploaded'))
        emit('upload', res);
      },
      onError() {
        ElMessage.error(t('Upload failed'))
      }
    }
  }
}
</script>
<style scoped>
.basic-file-uploader {
  padding: 0 10px;
}

.uploader :deep(.el-upload),
.uploader :deep(.el-upload-dragger) {
  width: 100%;
}

.uploader-header-container {
  text-align: start;
}

.uploader-icon-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.el-upload__text {
  text-align: center;
}

.el-upload__text em {
  text-decoration: underline;
}

.custom-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
  margin-bottom: 0;
}

.default-icon {
  font-size: 400%;
}
</style>
