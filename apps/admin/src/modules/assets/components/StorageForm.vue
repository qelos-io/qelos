<template>
  <el-form class="storage-form" @submit.native.prevent="submit">
    <div class="edit-header">
      <h2>{{ title }}<strong v-if="value">{{ value.name }}</strong></h2>
      <div class="buttons-group">
        <el-button native-type="submit" type="primary" :loading="submitting">
          <el-icon><StorageIcons name="icon-check" /></el-icon>
          {{ t('Save') }}
        </el-button>
      </div>
    </div>
    
    <el-card class="form-card">
      <template #header>
        <div class="card-header">
          <el-icon><StorageIcons name="icon-setting" /></el-icon>
          <span>{{ t('General Settings') }}</span>
        </div>
      </template>
      
      <div class="form-content">
        <el-row :gutter="20">
          <el-col :span="24">
            <FormInput
              title="Name"
              :model-value="editedStorage.name"
              @input="editedStorage.name = $event"
              placeholder="Enter storage name"
            >
              <template #prefix>
                <el-icon><StorageIcons name="icon-document" /></el-icon>
              </template>
            </FormInput>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="Storage Provider">
              <div class="provider-selection">
                <div 
                  v-for="provider in providers" 
                  :key="provider.value"
                  class="provider-option"
                  :class="{ 'selected': editedStorage.kind === provider.value }"
                  @click="editedStorage.kind = provider.value"
                >
                  <div class="provider-icon">
                    <component :is="provider.icon" />
                  </div>
                  <div class="provider-label">{{ provider.label }}</div>
                </div>
              </div>
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item>
              <el-checkbox
                v-model="editedStorage.isDefault"
                label="Set as Default Storage"
              />
              <el-tooltip content="When checked, this storage will be used as the default for all new assets" placement="top">
                <el-icon class="info-icon"><StorageIcons name="icon-info-filled" /></el-icon>
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card class="form-card">
      <template #header>
        <div class="card-header">
          <el-icon><icon-link /></el-icon>
          <span>{{ t('Connection Settings') }}</span>
        </div>
      </template>
      
      <div class="form-content">
        <el-row :gutter="20">
          <el-col :span="24" :md="12">
            <FormInput
              title="Public URL"
              v-model="editedStorage.metadata.publicUrl"
              placeholder="https://your-public-url.com"
            />
          </el-col>
          
          <el-col :span="24" :md="12">
            <FormInput
              title="Base Storage Path"
              v-model="editedStorage.metadata.basePath"
              placeholder="/"
            />
          </el-col>
          
          <el-col :span="24" v-if="editedStorage.kind !== 'ftp'">
            <FormInput
              :title="editedStorage.kind === 'cloudinary' ? 'Cloud Name' : 'Bucket Name'"
              v-model="editedStorage.metadata.bucketName"
              :placeholder="editedStorage.kind === 'cloudinary' ? 'your-cloud-name' : 'your-bucket-name'"
            />
          </el-col>
          <el-col :span="24" v-if="editedStorage.kind === 's3'">
            <FormInput
              title="Bucket URL"
              label="The URL of your storage bucket. Optional"
              v-model="editedStorage.metadata.bucketUrl"
              placeholder="https://your-bucket-url.com"
            />
            <FormInput
              title="Signature Version"
              label="The signature version of your storage bucket. Optional"
              v-model="editedStorage.metadata.signatureVersion"
              placeholder="v4"
            />
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card class="form-card">
      <template #header>
        <div class="card-header authentication-header" @click="showAuth = !showAuth">
          <el-icon><StorageIcons name="icon-lock" /></el-icon>
          <span>{{ t('Authentication Secrets') }}</span>
          <el-icon class="toggle-icon">
            <StorageIcons name="icon-arrow-down" v-if="showAuth"/>
            <StorageIcons name="icon-arrow-right" v-else/>
          </el-icon>
        </div>
      </template>
      
      <div class="form-content" v-if="showAuth">
        <el-alert
          type="info"
          :closable="false"
          class="auth-info"
        >
          <el-icon><StorageIcons name="icon-info" /></el-icon>
          {{ t('These credentials will be securely stored and used to connect to your storage provider.') }}
        </el-alert>
        
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
          v-else-if="editedStorage.kind === 'cloudinary'"
          v-model="editedStorage.authentication"
        />
      </div>
    </el-card>
  </el-form>
</template>
<script lang="ts" setup>
import StorageFtpAuth from './StorageFtpAuth.vue'
import StorageGcsAuth from './StorageGcsAuth.vue'
import StorageS3Auth from './StorageS3Auth.vue'
import StorageCloudinaryAuth from './StorageCloudinaryAuth.vue'
import StorageIcons from './StorageIcons.vue'
import FormInput from '../../core/components/forms/FormInput.vue'
import { useStorageForm } from '../compositions/storages'
import { IStorage } from '@/services/types/storage';
import { useI18n } from 'vue-i18n';
import { h } from 'vue';

const { t } = useI18n();

const props = defineProps({
  value: Object as () => IStorage,
  title: String,
  submitting: Boolean
})

const emit = defineEmits(['submitted'])

const { editedStorage, showAuth } = useStorageForm(props)

const providers = [
  { 
    value: 's3', 
    label: 'Amazon S3', 
    icon: () => h(StorageIcons, { name: 'icon-amazon-s3' }),
    description: 'Use Amazon S3 for scalable cloud storage'
  },
  { 
    value: 'gcs', 
    label: 'Google Cloud', 
    icon: () => h(StorageIcons, { name: 'icon-google-cloud' }),
    description: 'Use Google Cloud Storage for your assets'
  },
  { 
    value: 'cloudinary', 
    label: 'Cloudinary', 
    icon: () => h(StorageIcons, { name: 'icon-cloudinary' }),
    description: 'Use Cloudinary for media optimization and delivery'
  },
  { 
    value: 'ftp', 
    label: 'FTP', 
    icon: () => h(StorageIcons, { name: 'icon-ftp' }),
    description: 'Use traditional FTP for file transfers'
  }
];

const submit = () => {
  return emit('submitted', editedStorage)
}
</script>
<style scoped lang="scss">
.storage-form {
  margin: 0 3px;
  width: 100%;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 20px;
  
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    
    strong {
      margin-left: 8px;
      color: var(--el-color-primary);
    }
  }
}

.form-card {
  margin-block-end: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 16px;
  }
}

.form-content {
  padding: 20px 10px;
}

.provider-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-block-start: 10px;
  justify-content: center;
  
  @media (max-width: 768px) {
    gap: 10px;
    justify-content: space-between;
  }
}

.provider-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 140px;
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    width: calc(50% - 5px);
    height: 120px;
    padding: 10px;
  }
  
  &:hover {
    border-color: var(--el-color-primary-light-5);
    background-color: var(--el-color-primary-light-9);
  }
  
  &.selected {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-8);
  }
  
  .provider-icon {
    font-size: 36px;
    margin-bottom: 10px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .provider-label {
    text-align: center;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.2;
    word-break: break-word;
  }
}

.authentication-header {
  cursor: pointer;
  
  .toggle-icon {
    margin-inline-start: auto;
  }
}

.auth-info {
  margin-block-end: 20px;
}

.help-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.info-icon {
  margin-left: 5px;
  font-size: 14px;
  color: var(--el-color-info);
  cursor: help;
}
</style>
