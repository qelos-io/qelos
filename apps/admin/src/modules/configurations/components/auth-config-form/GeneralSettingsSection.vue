<template>
  <div class="section-container">
    <h2 class="section-title">{{ $t('General Settings') }}</h2>
    <div class="flex-row-column">
      <BlockItem>
        <FormInput v-model="showLoginPage" title="Show Login Page?" type="switch">
          <template #help>
            <span class="help-text">{{ $t('Enable or disable the login page for your application') }}</span>
          </template>
        </FormInput>

        <div v-if="showLoginPage" class="form-subsection">
          <div class="subsection-label">Form Position</div>
          <div class="flex-row positions-list">
            <div class="position-option left" @click="formPosition = 'left'"
                :class="{selected: formPosition === 'left'}">
              <div class="position-tooltip">{{ $t('Left') }}</div>
            </div>
            <div class="position-option right" @click="formPosition = 'right'"
                :class="{selected: formPosition === 'right'}">
              <div class="position-tooltip">{{ $t('Right') }}</div>
            </div>
            <div class="position-option center" @click="formPosition = 'center'"
                :class="{selected: formPosition === 'center'}">
              <div class="inner"/>
              <div class="position-tooltip">{{ $t('Center') }}</div>
            </div>
            <div class="position-option top" @click="formPosition = 'top'"
                :class="{selected: formPosition === 'top'}">
              <div class="position-tooltip">{{ $t('Top') }}</div>
            </div>
            <div class="position-option bottom" @click="formPosition = 'bottom'"
                :class="{selected: formPosition === 'bottom'}">
              <div class="position-tooltip">{{ $t('Bottom') }}</div>
            </div>
          </div>
        </div>
      </BlockItem>
      <BlockItem>
        <div class="enhanced-toggle-container">
          <FormInput v-model="showRegisterPage" type="switch">
            <template #pre>
              <div>{{$t('Show Registration Page?')}}</div>
              <div class="toggle-icon">
                <font-awesome-icon :icon="['fas', 'user-plus']" :class="{'active': showRegisterPage}" />
              </div>
            </template>
            <template #help>
              <div class="toggle-help">
                <span class="help-text">{{ $t('Enable or disable the registration page for new users') }}</span>
                <div v-if="showRegisterPage" class="toggle-status enabled">
                  <font-awesome-icon :icon="['fas', 'check-circle']" /> 
                  {{ $t('Registration is enabled - New users can create accounts') }}
                </div>
                <div v-else class="toggle-status disabled">
                  <font-awesome-icon :icon="['fas', 'info-circle']" /> 
                  {{ $t('Registration is disabled - Only existing users can log in') }}
                </div>
              </div>
            </template>
          </FormInput>
        </div>
      </BlockItem>
      <BlockItem>
        <div class="username-type-selector">
          <div class="selector-header">
            <h4>{{ $t('Treat Username As') }}</h4>
            <span class="selector-description">{{ $t('Determines how username fields will be validated') }}</span>
          </div>
          
          <div class="username-options">
            <div 
              class="username-option" 
              :class="{ selected: treatUsernameAs === 'email' }"
              @click="treatUsernameAs = 'email'"
            >
              <div class="option-icon">
                <font-awesome-icon :icon="['fas', 'envelope']" />
              </div>
              <div class="option-content">
                <div class="option-title">{{ $t('Email') }}</div>
                <div class="option-description">{{ $t('Users log in with email addresses') }}</div>
              </div>
              <div class="option-check">
                <font-awesome-icon :icon="['fas', 'check-circle']" />
              </div>
            </div>
            
            <div 
              class="username-option" 
              :class="{ selected: treatUsernameAs === 'username' }"
              @click="treatUsernameAs = 'username'"
            >
              <div class="option-icon">
                <font-awesome-icon :icon="['fas', 'user']" />
              </div>
              <div class="option-content">
                <div class="option-title">{{ $t('Username') }}</div>
                <div class="option-description">{{ $t('Users log in with custom usernames') }}</div>
              </div>
              <div class="option-check">
                <font-awesome-icon :icon="['fas', 'check-circle']" />
              </div>
            </div>
            
            <div 
              class="username-option" 
              :class="{ selected: treatUsernameAs === 'phone' }"
              @click="treatUsernameAs = 'phone'"
            >
              <div class="option-icon">
                <font-awesome-icon :icon="['fas', 'phone']" />
              </div>
              <div class="option-content">
                <div class="option-title">{{ $t('Phone') }}</div>
                <div class="option-description">{{ $t('Users log in with phone numbers') }}</div>
              </div>
              <div class="option-check">
                <font-awesome-icon :icon="['fas', 'check-circle']" />
              </div>
            </div>
          </div>
          
          <div class="selector-help">
            <font-awesome-icon :icon="['fas', 'info-circle']" />
            <span>{{ $t('This affects validation rules and keyboard types on mobile devices') }}</span>
          </div>
        </div>
      </BlockItem>
    </div>
  </div>
</template>

<script lang="ts" setup>
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';

const showLoginPage = defineModel<boolean>('showLoginPage', { required: true });
const showRegisterPage = defineModel<boolean>('showRegisterPage', { required: true });
const treatUsernameAs = defineModel<string>('treatUsernameAs', { required: true });
const formPosition = defineModel<string>('formPosition', { required: true });
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

.form-subsection {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--el-border-color-lighter, #ebeef5);
}

.subsection-label {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: var(--el-text-color-secondary, #909399);
}

.positions-list {
  flex-wrap: wrap;
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.position-option {
  display: block;
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  margin: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 0;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1;
    
    .position-tooltip {
      opacity: 1;
      transform: translateY(0);
      z-index: 99999;
    }
  }

  &.left {
    border-left: 4px solid #759b7d;
  }

  &.right {
    border-right: 4px solid #759b7d;
  }

  &.top {
    border-top: 4px solid #759b7d;
  }

  &.bottom {
    border-bottom: 4px solid #759b7d;
  }

  &.center {
    position: relative;

    .inner {
      position: absolute;
      top: 15%;
      bottom: 15%;
      left: 15%;
      right: 15%;
      border: 4px solid #759b7d;
      border-radius: 2px;
    }
  }

  &.selected {
    background-color: rgba(117, 155, 125, 0.15);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .position-tooltip {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%) translateY(5px);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
    z-index: 1;
  }
}

.enhanced-toggle-container {
  margin-bottom: 0.5rem;
}

.toggle-icon {
  margin-right: 0.75rem;
  font-size: 1.1rem;
  color: var(--el-text-color-secondary, #909399);
  transition: color 0.3s ease;
}

.toggle-icon .active {
  color: var(--el-color-primary, #409eff);
}

.toggle-help {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-status {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.toggle-status.enabled {
  background-color: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
  border-left: 3px solid var(--el-color-success, #67c23a);
}

.toggle-status.disabled {
  background-color: var(--el-color-info-light-9, #f4f4f5);
  color: var(--el-color-info, #909399);
  border-left: 3px solid var(--el-color-info, #909399);
}

.help-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  display: block;
  margin-top: 0.25rem;
}

/* Username type selector */
.username-type-selector {
  margin-top: 0.5rem;
}

.selector-header {
  margin-bottom: 1rem;
}

.selector-header h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.selector-description {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary, #909399);
}

.username-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.username-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
  background-color: var(--el-bg-color, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--el-color-primary-light-5, #a0cfff);
    background-color: var(--el-color-primary-light-9, #ecf5ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &.selected {
    border-color: var(--el-color-primary, #409eff);
    background-color: var(--el-color-primary-light-9, #ecf5ff);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    
    .option-icon {
      background-color: var(--el-color-primary, #409eff);
      color: white;
    }
    
    .option-check {
      opacity: 1;
      color: var(--el-color-primary, #409eff);
    }
    
    .option-title {
      color: var(--el-color-primary, #409eff);
      font-weight: 600;
    }
  }
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular, #606266);
  font-size: 1.25rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
}

.option-description {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.4;
}

.option-check {
  font-size: 1.25rem;
  opacity: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.selector-help {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--el-fill-color-lighter, #f5f7fa);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
}

.selector-help svg {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .section-container {
    padding: 1rem;
    margin-bottom: 1rem;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .positions-list {
    gap: 0.5rem;
  }
  
  .position-option {
    width: 36px;
    height: 36px;
    margin: 4px;
  }
  
  .username-option {
    padding: 0.75rem;
  }
  
  .option-icon {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }
}
</style>
