<template>
  <div class="section-container">
    <h2 class="section-title">{{ $t('Login Page Appearance') }}</h2>
    <BlockItem>
      <div class="image-section">
        <div class="image-tabs">
          <div 
            class="image-tab" 
            :class="{active: activeImageTab === 'horizontal'}"
            @click="activeImageTab = 'horizontal'"
          >
            <font-awesome-icon :icon="['fas', 'image']" />
            {{ $t('Main Background') }}
          </div>
          <div 
            class="image-tab" 
            :class="{active: activeImageTab === 'vertical'}"
            @click="activeImageTab = 'vertical'"
          >
            <font-awesome-icon :icon="['fas', 'mobile-screen']" />
            {{ $t('Vertical Background') }}
          </div>
          <div 
            class="image-tab" 
            :class="{active: activeImageTab === 'content'}"
            @click="activeImageTab = 'content'"
          >
            <font-awesome-icon :icon="['fas', 'pen-to-square']" />
            {{ $t('Login Content') }}
          </div>
        </div>
        
        <div class="image-content" v-if="activeImageTab === 'horizontal'">
          <div class="image-preview-container">
            <div 
              class="image-preview horizontal-preview" 
              :style="{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }"
            >
              <div v-if="!backgroundImage" class="no-image">
                <font-awesome-icon :icon="['fas', 'image']" />
                <span>{{ $t('No image selected') }}</span>
              </div>
              <button v-else class="remove-image" @click="backgroundImage = ''">
                <font-awesome-icon :icon="['fas', 'trash']" />
              </button>
            </div>
            <div class="image-description">
              <font-awesome-icon :icon="['fas', 'info-circle']" />
              {{ $t('Used for desktop and landscape views') }}
            </div>
          </div>
          
          <FormInput v-model="backgroundImage" title="Background Image" type="upload">
            <template #help>
              <span class="help-text">{{ $t('Add a background image to enhance your login page') }}</span>
            </template>
          </FormInput>
          <div class="separator">{{ $t('-- OR --') }}</div>
          <FormInput v-model="backgroundImage" title="Background Image URL" type="url"/>
        </div>
        
        <div class="image-content" v-if="activeImageTab === 'vertical'">
          <div class="image-preview-container">
            <div 
              class="image-preview vertical-preview" 
              :style="{ backgroundImage: verticalBackgroundImage ? `url(${verticalBackgroundImage})` : 'none' }"
            >
              <div v-if="!verticalBackgroundImage" class="no-image">
                <font-awesome-icon :icon="['fas', 'mobile-screen']" />
                <span>{{ $t('No image selected') }}</span>
              </div>
              <button v-else class="remove-image" @click="verticalBackgroundImage = ''">
                <font-awesome-icon :icon="['fas', 'trash']" />
              </button>
            </div>
            <div class="image-description">
              <font-awesome-icon :icon="['fas', 'info-circle']" />
              {{ $t('Used for mobile and portrait views') }}
            </div>
          </div>
          
          <FormInput v-model="verticalBackgroundImage" title="Vertical Background Image" type="upload">
            <template #help>
              <span class="help-text">{{ $t('Add a vertical background image optimized for mobile devices') }}</span>
            </template>
          </FormInput>
          <div class="separator">{{ $t('-- OR --') }}</div>
          <FormInput v-model="verticalBackgroundImage" title="Vertical Background Image URL" type="url"/>
        </div>
      </div>
      
      <div class="image-content" v-if="activeImageTab === 'content'">
        <div class="content-preview-container">
          <div class="content-preview">
            <div class="content-preview-header">
              <div v-if="slots?.loginHeader" class="content-preview-slot header-slot">
                <font-awesome-icon :icon="['fas', 'puzzle-piece']" />
                <span>{{ $t('Custom Header Content') }}</span>
              </div>
              <h3 v-else>{{ loginTitle || $t('Welcome') }}</h3>
            </div>
            <div class="content-preview-form">
              <div class="form-placeholder">
                <font-awesome-icon :icon="['fas', 'user-lock']" class="placeholder-icon" />
                <span>{{ $t('Login Form Fields') }}</span>
              </div>
            </div>
            <div v-if="slots?.loginFooter" class="content-preview-slot footer-slot">
              <font-awesome-icon :icon="['fas', 'puzzle-piece']" />
              <span>{{ $t('Custom Footer Content') }}</span>
            </div>
          </div>
          <div class="image-description">
            <font-awesome-icon :icon="['fas', 'info-circle']" />
            {{ $t('Login form content preview') }}
          </div>
        </div>
        
        <FormInput v-model="loginTitle"
                  :disabled="!!slots?.loginHeader"
                  title="Title of Login Page"
                  :placeholder="$t('Welcome')">
          <template #help>
            <span class="help-text" v-if="!!slots?.loginHeader">{{ $t('Disabled because a custom header is selected') }}</span>
            <span class="help-text" v-else>{{ $t('The main heading displayed on your login page') }}</span>
          </template>
        </FormInput>

        <FormRowGroup>
          <BlocksSelector v-model="slots.loginHeader" editable title="Header Content Box">
            <template #help>
              <span class="help-text">{{ $t('Custom content to display at the top of the login form') }}</span>
            </template>
          </BlocksSelector>
          <BlocksSelector v-model="slots.loginFooter" editable title="Footer Content Box">
            <template #help>
              <span class="help-text">{{ $t('Custom content to display at the bottom of the login form') }}</span>
            </template>
          </BlocksSelector>
        </FormRowGroup>

        <FormRowGroup v-if="props.formPosition === 'left' || props.formPosition === 'right'">
          <BlocksSelector v-model="slots.loginAside" editable title="Aside Content Box">
            <template #help>
              <span class="help-text">{{ $t('Custom content to display on the opposite side of the login form (when form is positioned left or right)') }}</span>
            </template>
          </BlocksSelector>
        </FormRowGroup>
      </div>
    </BlockItem>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import BlocksSelector from '@/modules/blocks/components/BlocksSelector.vue';

const backgroundImage = defineModel<string>('backgroundImage');
const verticalBackgroundImage = defineModel<string>('verticalBackgroundImage');
const loginTitle = defineModel<string>('loginTitle');
const slots = defineModel<Record<string, any>>('slots', { required: true });

// Props
const props = defineProps<{
  formPosition?: string;
}>();

const activeImageTab = ref<'horizontal' | 'vertical' | 'content'>('horizontal');
</script>

<style scoped>
.section-container {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary, #303133);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  padding-bottom: 0.75rem;
}

.help-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  display: block;
  margin-top: 0.25rem;
}

.image-section {
  margin-bottom: 1.5rem;
}

.image-tabs {
  display: flex;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  margin-bottom: 1rem;
}

.image-tab {
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--el-text-color-secondary, #909399);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.image-tab:hover {
  color: var(--el-color-primary, #409eff);
}

.image-tab.active {
  color: var(--el-color-primary, #409eff);
  border-bottom-color: var(--el-color-primary, #409eff);
}

.image-content {
  padding: 1rem 0;
}

.image-preview-container {
  margin-bottom: 1.5rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.image-preview {
  position: relative;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.horizontal-preview {
  height: 180px;
  border-radius: 8px 8px 0 0;
}

.vertical-preview {
  height: 300px;
  width: 200px;
  margin: 0 auto;
  border-radius: 8px 8px 0 0;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
  gap: 0.5rem;
  height: 100%;
  width: 100%;
  background-color: var(--el-fill-color-lighter, #f5f7fa);
}

.no-image .fa-image,
.no-image .fa-mobile-screen {
  font-size: 2rem;
  opacity: 0.5;
}

.remove-image {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
  background-color: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-color-danger, #f56c6c);
  transition: all 0.2s ease;
}

.remove-image:hover {
  background-color: var(--el-color-danger, #f56c6c);
  color: white;
}

.image-description {
  padding: 0.75rem;
  background-color: var(--el-fill-color-lighter, #f5f7fa);
  color: var(--el-text-color-secondary, #909399);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.separator {
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  margin: 1rem 0;
  position: relative;
  font-size: 0.85rem;
}

.separator::before,
.separator::after {
  content: '';
  position: absolute;
  inset-block-start: 50%;
  width: 40%;
  height: 1px;
  background-color: var(--el-border-color-lighter, #ebeef5);
}

.separator::before {
  inset-inline-start: 0;
}

.separator::after {
  inset-inline-end: 0;
}

.content-preview-container {
  margin-bottom: 1.5rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.content-preview {
  background-color: var(--el-bg-color, #ffffff);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 220px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px 8px 0 0;
}

.content-preview-header {
  text-align: center;
}

.content-preview-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--el-text-color-primary, #303133);
}

.content-preview-form {
  flex: 1;
}

.form-placeholder {
  height: 100%;
  background-color: var(--el-fill-color-lighter, #f5f7fa);
  border-radius: 4px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
  min-height: 80px;
  gap: 0.5rem;
}

.placeholder-icon {
  font-size: 1.5rem;
  opacity: 0.6;
}

.content-preview-slot {
  padding: 0.75rem;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  border-radius: 4px;
  border: 1px dashed var(--el-color-primary-light-5, #a0cfff);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.header-slot {
  margin-bottom: 1rem;
}

.footer-slot {
  margin-top: 0.5rem;
}
</style>
