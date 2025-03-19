<template>
  <el-form class="storage-form" @submit.native.prevent="submit">
    <div class="edit-header">
      <h2>{{ title }}<strong v-if="value">{{ value.name }}</strong></h2>
      <div class="buttons-group">
        <el-button native-type="submit" type="primary" :loading="submitting">
          <el-icon>
            <icon-promotion/>
          </el-icon>
        </el-button>
      </div>
    </div>
    <div class="form-content">
      <FormInput
          title="Name"
          :model-value="editedStorage.name"
          @input="editedStorage.name = $event"
      />
      <FormInput
          title="Public URL"
          :model-value="editedStorage.metadata.publicUrl"
          @input="editedStorage.metadata.publicUrl = $event"
      />
      <FormInput
          title="Base Storage Path"
          :model-value="editedStorage.metadata.basePath"
          @input="editedStorage.metadata.basePath = $event"
      />
      <el-checkbox
          v-model="editedStorage.isDefault"
          label="Set as Default Storage"
      />
      <p>
        <label>
          {{ t('Kind') }}:
          <el-select
              :model-value="editedStorage.kind"
              @change="editedStorage.kind = $event"
          >
            <el-option value="s3" label="Amazon S3"/>
            <el-option value="gcs" label="Google Cloud"/>
            <el-option value="cloudinary" label="Cloudinary"/>
            <el-option value="ftp" label="FTP"/>
          </el-select>
        </label>
      </p>
      <FormInput
          v-if="editedStorage.kind !== 'ftp'"
          :title="editedStorage.kind === 'cloudinary' ? 'Cloud Name' : 'Bucket Name'"
          :model-value="editedStorage.metadata.bucketName"
          @input="editedStorage.metadata.bucketName = $event"
      />
      <div class="authentication">
        <h3 @click="showAuth = !showAuth">
          <el-icon>
            <icon-arrow-down v-if="showAuth"/>
            <icon-arrow-right v-else/>
          </el-icon>
          {{ t('Authentication Secrets') }}
        </h3>
        <template v-if="showAuth">
          <StorageFtpAuth
              v-if="editedStorage.kind === 'ftp'"
              v-model="editedStorage.authentication"
          />
          <StorageGcsAuth
              v-else-if="editedStorage.kind === 'gcs'"
              v-model="editedStorage.authentication"
          />
          <StorageS3Auth
              v-else-if="editedStorage.kind === 's3'"
              v-model="editedStorage.authentication"
          />
          <StorageCloudinaryAuth
              v-if="editedStorage.kind === 'cloudinary'"
              v-model="editedStorage.authentication"
          />
        </template>
      </div>
    </div>
  </el-form>
</template>
<script lang="ts" setup>
import StorageFtpAuth from './StorageFtpAuth.vue'
import StorageGcsAuth from './StorageGcsAuth.vue'
import StorageS3Auth from './StorageS3Auth.vue'
import StorageCloudinaryAuth from './StorageCloudinaryAuth.vue'
import FormInput from '../../core/components/forms/FormInput.vue'
import { useStorageForm } from '../compositions/storages'
import { IStorage } from '@/services/types/storage';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  value: Object as () => IStorage,
  title: String,
  submitting: Boolean
})

const emit = defineEmits(['submitted'])

const { editedStorage, showAuth } = useStorageForm(props)

const submit = () => {
  return emit('submitted', editedStorage)
}
</script>
<style scoped lang="scss">

.storage-form {
  margin: 0 3px;
}

.form-content {
  padding: 10px;
}

.authentication {
  border: 1px solid #eee;
  padding: 10px;
  margin: 10px;

  h3 {
    color: var(--main-color);
    cursor: pointer;
  }
}
</style>
