<template>
  <div class="basic-file-uploader">
    <el-upload class="uploader" drag :headers="headers" :action="uploadUrl" :with-credentials="withCredentials"
      :on-success="onSuccess" :before-upload="beforeUpload">
      <div v-if="header" class="uploader-header-container">
        <h3>{{ header }}</h3>
        <p v-if="subheader">{{ subheader }}</p>
      </div>

      <div class="uploader-icon-container">
        <img v-if="iconUrl" :src="iconUrl" class="custom-icon" alt="Upload icon" />
        <el-icon v-else class="default-icon">
          <font-awesome-icon :icon="['fas', 'cloud-arrow-up']" />
        </el-icon>
      </div>

      <div class="el-upload__text">
        <p>{{ mainText }}</p>
        <em>{{ secondaryText }}</em>
      </div>
    </el-upload>
  </div>
</template>
<script lang="ts">
import { ref, nextTick } from 'vue'
import { useAssetsUpload } from '../compositions/assets'

export default {
  name: 'BasicFileUploader',
  props: {
    storage: String,

    // UI Design props
    header: String,
    subheader: String,
    iconUrl: String,
    mainText: {
      type: String,
      default: 'Drop file here or '
    },
    secondaryText: {
      type: String,
      default: 'click to upload'
    }
  },
  emits: ['upload'],
  setup(props, { emit }) {
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
        emit('upload', res);
      }
    }
  }
}
</script>
<style scoped>
.default-icon {
  font-size: 400%;
}

.basic-file-uploader {
  padding: 0 10px;
}

.uploader :deep(.el-upload),
.uploader :deep(.el-upload-dragger) {
  width: 100%;
}

.custom-icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 0;
}
</style>
