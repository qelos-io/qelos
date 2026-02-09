<template>
  <div v-if="type !== 'hidden'" :class="{'form-input-container': true, 'is-disabled': disabled}">
    <EditComponentBar v-if="isEditingEnabled"/>
    <el-form-item 
      :label="title ? $t(title) : null" 
      :required="required"
      :error="validationError"
      :class="{
        'has-help': helpText || description,
        'is-error': !!validationError,
        'is-success': modelValue && validated && !validationError,
      }"
    >
      <template #label v-if="title">
        <div class="label-container">
          <span>{{ $t(title) }}</span>
          <small v-if="label"> ({{ $t(label) }})</small>
          <small v-else-if="gap">&nbsp;</small>
          <el-popover
            v-if="tooltip || helpContent" 
            :width="helpPopoverWidth"
            trigger="click"
            placement="top"
            :popper-class="`form-input-help-popover ${helpPopoverClass}`"
          >
            <template #reference>
              <el-icon class="tooltip-icon"><QuestionFilled /></el-icon>
            </template>
            
            <template v-if="tooltip">
              <div class="help-popover-content">
                <p>{{ $t(tooltip) }}</p>
              </div>
            </template>
            
            <template v-else-if="helpContent">
              <div class="help-popover-content" v-html="$t(helpContent)"></div>
            </template>
          </el-popover>
          
          <el-tooltip 
            v-else-if="tooltipSimple" 
            :content="$t(tooltipSimple)" 
            placement="top" 
            :effect="tooltipEffect"
          >
            <el-icon class="tooltip-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <slot name="pre"/>
      
      <!-- Number input -->
      <el-input-number 
        v-if="type === 'number'" 
        v-on="listeners" 
        :size="size || 'large'"
        :model-value="modelValue as number"
        :min="min"
        :max="max"
        :step="step"
        :precision="precision"
        :disabled="disabled"
        :loading="loading"
        :placeholder="placeholder"
      />
      
      <!-- Switch input -->
      <el-switch
        v-else-if="type === 'switch'"
        v-model="modelValue as boolean"
        v-on="listeners"
        :size="size || 'large'"
        inline-prompt
        :disabled="disabled"
        :loading="loading"
        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
        :active-text="activeText || 'Y'"
        :inactive-text="inactiveText || 'N'"
      />
      
      <!-- Select input -->
      <el-select 
        v-else-if="type === 'select'" 
        :model-value="modelValue as any" 
        :placeholder="placeholder"
        :size="size || 'large'"
        :disabled="disabled"
        :loading="loading"
        v-on="listeners"
        v-bind="selectOptions"
        @update:model-value="$emit('update:modelValue', $event)"
        :required="required"
        :clearable="clearable"
      >
        <template v-if="options?.length">
          <el-option 
            v-for="(option, index) in options"
            :key="option[optionValue] || option.identifier || option._id || index"
            :label="option[optionLabel] || option.name || option.title || option.label || option.metadata?.title || option"
            :value="option[optionValue] || option.identifier || option._id || option"
          />
        </template>
        <slot name="options"/>
      </el-select>
      
      <!-- File upload -->
      <AssetUploader 
        v-else-if="type === 'upload' || type === 'file'" 
        v-on="listeners" 
        :value="modelValue" 
        :upload-config="uploadConfig"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event)" 
        class="asset-upload"
      />
      
      <!-- Icon selector -->
      <IconSelector 
        v-else-if="type === 'icon'" 
        v-model="modelValue as string" 
        :title="title" 
        :size="size || 'large'"
      />
      
      <!-- Color picker -->
      <el-color-picker 
        v-else-if="type === 'color'" 
        v-model="modelValue as string" 
        :size="size || 'large'"
        :disabled="disabled"
        :show-alpha="showAlpha"
      />
      
      <!-- Masked input -->
      <el-input 
        v-else-if="mask"
        ref="maskedInputRef"
        v-on="maskedListeners" 
        :model-value="displayValue" 
        :placeholder="placeholder"
        :size="size || 'large'"
        :native-type="type"
        :disabled="disabled"
        :loading="loading"
        :required="required"
        :type="type"
        :maxlength="maxlength || getMaskMaxLength(mask)"
        :show-word-limit="showCharCount && !!maxlength"
        :clearable="clearable"
        :show-password="type === 'password' && showPasswordToggle"
        :autocomplete="autocomplete as any"
        :aria-label="ariaLabel || title"
      >
        <template #append v-if="maskHint">
          <div class="mask-hint">{{ maskHint }}</div>
        </template>
        <template #prefix v-if="prefixIcon || $slots.prefix">
          <slot name="prefix">
            <el-icon v-if="prefixIcon"><component :is="prefixIcon" /></el-icon>
          </slot>
        </template>
        
        <template #suffix v-if="suffixIcon || $slots.suffix">
          <slot name="suffix">
            <el-icon v-if="suffixIcon"><component :is="suffixIcon" /></el-icon>
          </slot>
        </template>
        
        <template #prepend v-if="prepend || $slots.prepend">
          <slot name="prepend">
            {{ prepend }}
          </slot>
        </template>
        
        <template #append v-if="append || $slots.append">
          <slot name="append">
            {{ append }}
          </slot>
        </template>
      </el-input>
      
      <!-- Default text input -->
      <el-input 
        v-else 
        v-on="listeners" 
        :model-value="modelValue as (string | number)" 
        :placeholder="placeholder"
        :size="size || 'large'"
        :native-type="type"
        :disabled="disabled"
        :loading="loading"
        :required="required"
        :type="type"
        :maxlength="maxlength"
        :show-word-limit="showCharCount && !!maxlength"
        :clearable="clearable"
        :show-password="type === 'password' && showPasswordToggle"
        :autocomplete="autocomplete as any"
        :aria-label="ariaLabel || title"
      >
        <template #prefix v-if="prefixIcon || $slots.prefix">
          <slot name="prefix">
            <el-icon v-if="prefixIcon"><component :is="prefixIcon" /></el-icon>
          </slot>
        </template>
        
        <template #suffix v-if="suffixIcon || $slots.suffix">
          <slot name="suffix">
            <el-icon v-if="suffixIcon"><component :is="suffixIcon" /></el-icon>
          </slot>
        </template>
        
        <template #prepend v-if="prepend || $slots.prepend">
          <slot name="prepend">
            {{ prepend }}
          </slot>
        </template>
        
        <template #append v-if="append || $slots.append">
          <slot name="append">
            {{ append }}
          </slot>
        </template>
      </el-input>
      
      <!-- Help text, description and validation messages -->
      <div class="help-text-container">
        <div v-if="helpText || description" class="help-text">
          <small v-if="helpText">{{ $t(helpText) }}</small>
          <small v-if="description" class="description">{{ $t(description) }}</small>
        </div>
        
        <transition name="fade">
          <div v-if="validationError" class="validation-error">
            <el-icon class="error-icon"><WarningFilled /></el-icon>
            <span>{{ validationError }}</span>
          </div>
        </transition>
        
        <transition name="fade">
          <div v-if="showValidationSuccess && modelValue && validated && !validationError" class="validation-success">
            <el-icon class="success-icon"><CircleCheckFilled /></el-icon>
            <span>{{ validationSuccessMessage || $t('Valid input') }}</span>
          </div>
        </transition>
      </div>
    </el-form-item>
    <slot/>
  </div>
  <div v-else-if="isEditingEnabled">
    <EditComponentBar/>
  </div>
</template>

<script lang="ts">
import { ref, watch, nextTick } from 'vue';
import AssetUploader from '@/modules/assets/components/AssetUploader.vue'
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';
import IconSelector from '@/modules/core/components/forms/IconSelector.vue';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { QuestionFilled, WarningFilled, CircleCheckFilled } from '@element-plus/icons-vue';

export default {
  name: 'FormInput',
  computed: {
    isEditingEnabled() {
      return isEditingEnabled
    }
  },
  components: { EditComponentBar, AssetUploader, IconSelector, QuestionFilled, WarningFilled, CircleCheckFilled },
  props: {
    // Basic props
    title: String,
    label: String,
    type: String as () => 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'email' | 
                       'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'select' | 'hidden' | 
                       'icon' | 'date' | 'datetime' | 'time',
    placeholder: String,
    gap: Boolean,
    size: String as () => 'large' | 'default' | 'small',
    modelValue: [String, Number, Object, Boolean],
    disabled: Boolean,
    required: Boolean,
    
    // Validation props
    rules: [Object, Array],
    validationTrigger: {
      type: String,
      default: 'blur'
    },
    validationSuccessMessage: String,
    showValidationSuccess: {
      type: Boolean,
      default: false
    },
    validateOnMount: {
      type: Boolean,
      default: false
    },
    
    // Help and guidance props
    helpText: String,
    description: String,
    tooltip: String,
    tooltipSimple: String,
    tooltipEffect: {
      type: String,
      default: 'light'
    },
    helpContent: String,
    helpPopoverWidth: {
      type: Number,
      default: 300
    },
    helpPopoverClass: String,
    
    // Field grouping props
    groupId: String,
    groupPosition: String as () => 'first' | 'middle' | 'last' | 'single',
    groupLabel: String,
    groupLabelPosition: {
      type: String,
      default: 'top'
    },
    
    // Select props
    options: Array as () => any[],
    optionValue: String,
    optionLabel: String,
    selectOptions: {
      type: Object,
      default: () => ({})
    },
    
    // Number input props
    min: Number,
    max: Number,
    step: {
      type: Number,
      default: 1
    },
    precision: Number,
    
    // Text input props
    maxlength: Number,
    showCharCount: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: true
    },
    showPasswordToggle: {
      type: Boolean,
      default: true
    },
    
    // Switch props
    activeText: String,
    inactiveText: String,
    
    // Color picker props
    showAlpha: {
      type: Boolean,
      default: false
    },
    
    // Icon and decoration props
    prefixIcon: String,
    suffixIcon: String,
    prepend: String,
    append: String,
    
    // State props
    loading: Boolean,
    
    // Accessibility props
    ariaLabel: String,
    autocomplete: String,
    
    // Input masking props
    mask: String,
    maskHint: String,
    maskPlaceholder: {
      type: String,
      default: '_'
    },
    maskPreserve: {
      type: Boolean,
      default: false
    },
    maskPreset: String as () => 'phone' | 'date' | 'time' | 'credit-card' | 'currency' | 'percentage' | 'email' | 'url' | 'ip' | 'mac' | 'custom',
    
    // Legacy props
    value: [String, Number, Object, Boolean],
    uploadConfig: {
      type: Object,
      default: () => ({
        header: '',
        subheader: '',
        iconUrl: '',
        mainText: '',
        secondaryText: '',
        isImage: false
      })
    }
  },
  emits: ['input', 'change', 'update:modelValue', 'validate'],
  setup(props, { emit }) {
    // Handle input masking
    const maskedInputRef = ref(null);
    const rawValue = ref(props.modelValue as string || '');
    const displayValue = ref('');
    
    // Mask presets
    const maskPresets = {
      'phone': '+1 (###) ###-####',
      'date': '##/##/####',
      'time': '##:##',
      'credit-card': '#### #### #### ####',
      'currency': '#,###.##',
      'percentage': '##.##%',
      'email': '*{1,64}@*{1,255}',
      'url': 'http://*',
      'ip': '###.###.###.###',
      'mac': '##:##:##:##:##:##',
    };
    
    // Get the actual mask pattern to use
    const getMaskPattern = () => {
      if (!props.mask && !props.maskPreset) return '';
      if (props.mask) return props.mask;
      return maskPresets[props.maskPreset] || '';
    };
    
    // Get max length based on mask
    const getMaskMaxLength = (mask) => {
      if (!mask) return undefined;
      // Count only the mask characters that represent input positions
      return mask.split('').filter(char => ['#', '*', 'a', 'A', '9', '0'].includes(char)).length;
    };
    
    // Apply mask to value
    const applyMask = (value) => {
      if (!value) return '';
      
      const mask = getMaskPattern();
      if (!mask) return value;
      
      let result = '';
      let valueIndex = 0;
      
      for (let i = 0; i < mask.length; i++) {
        const maskChar = mask[i];
        const valueChar = value[valueIndex];
        
        if (!valueChar && !props.maskPreserve) break;
        
        // Handle special mask characters
        if (maskChar === '#') {
          // Only digits
          if (/\d/.test(valueChar)) {
            result += valueChar;
            valueIndex++;
          } else if (props.maskPreserve) {
            result += props.maskPlaceholder;
          } else {
            valueIndex++;
            i--; // Try next value char with same mask position
          }
        } else if (maskChar === '*') {
          // Any character
          if (valueChar) {
            result += valueChar;
            valueIndex++;
          } else if (props.maskPreserve) {
            result += props.maskPlaceholder;
          }
        } else if (maskChar === 'a') {
          // Only lowercase letters
          if (/[a-z]/i.test(valueChar)) {
            result += valueChar.toLowerCase();
            valueIndex++;
          } else if (props.maskPreserve) {
            result += props.maskPlaceholder;
          } else {
            valueIndex++;
            i--;
          }
        } else if (maskChar === 'A') {
          // Only uppercase letters
          if (/[a-z]/i.test(valueChar)) {
            result += valueChar.toUpperCase();
            valueIndex++;
          } else if (props.maskPreserve) {
            result += props.maskPlaceholder;
          } else {
            valueIndex++;
            i--;
          }
        } else if (maskChar === '9') {
          // Optional digit
          if (/\d/.test(valueChar)) {
            result += valueChar;
            valueIndex++;
          } else {
            result += props.maskPreserve ? props.maskPlaceholder : '';
            valueIndex++;
          }
        } else if (maskChar === '0') {
          // Optional any character
          if (valueChar) {
            result += valueChar;
            valueIndex++;
          } else {
            result += props.maskPreserve ? props.maskPlaceholder : '';
          }
        } else {
          // Static mask character
          result += maskChar;
          // Only increment value index if the value char matches the mask char
          if (valueChar === maskChar) {
            valueIndex++;
          }
        }
      }
      
      return result;
    };
    
    // Extract raw value from masked value
    const extractRawValue = (maskedValue) => {
      if (!maskedValue) return '';
      
      const mask = getMaskPattern();
      if (!mask) return maskedValue;
      
      let result = '';
      let maskIndex = 0;
      
      for (let i = 0; i < maskedValue.length; i++) {
        const maskChar = mask[maskIndex];
        const valueChar = maskedValue[i];
        
        if (!maskChar) break;
        
        if (['#', '*', 'a', 'A', '9', '0'].includes(maskChar)) {
          if (valueChar !== props.maskPlaceholder) {
            result += valueChar;
          }
          maskIndex++;
        } else if (valueChar === maskChar) {
          maskIndex++;
        } else {
          result += valueChar;
        }
      }
      
      return result;
    };
    
    // Handle masked input events
    const maskedListeners = {
      input: (event) => {
        const inputElement = event.target;
        const caretPosition = inputElement.selectionStart;
        
        // Apply mask to the current input value
        const maskedValue = applyMask(event.target.value);
        displayValue.value = maskedValue;
        
        // Extract raw value and emit it
        rawValue.value = extractRawValue(maskedValue);
        emit('input', rawValue.value);
        emit('update:modelValue', rawValue.value);
        
        // Restore caret position
        nextTick(() => {
          if (maskedInputRef.value && maskedInputRef.value.$el) {
            const input = maskedInputRef.value.$el.querySelector('input');
            if (input) {
              input.setSelectionRange(caretPosition, caretPosition);
            }
          }
        });
      },
      change: (event) => {
        emit('change', rawValue.value);
        if (props.validationTrigger === 'change') {
          validate();
        }
      },
      blur: () => {
        if (props.validationTrigger === 'blur') {
          validate();
        }
      }
    };
    
    // Initialize masked input
    if (props.mask || props.maskPreset) {
      displayValue.value = applyMask(props.modelValue as string || '');
    }
    
    // Watch for model value changes to update the masked display
    watch(() => props.modelValue, (newValue) => {
      if (props.mask || props.maskPreset) {
        displayValue.value = applyMask(newValue as string || '');
      }
    });
    
    // Handle validation
    const validationError = ref('');
    const validated = ref(false);
    
    const validate = () => {
      validationError.value = '';
      validated.value = true;
      
      if (!props.rules) return true;
      
      const rules = Array.isArray(props.rules) ? props.rules : [props.rules];
      
      for (const rule of rules) {
        if (rule.required && !props.modelValue) {
          validationError.value = rule.message || 'This field is required';
          emit('validate', false);
          return false;
        }
        
        if (rule.validator && typeof rule.validator === 'function') {
          try {
            const result = rule.validator(props.modelValue);
            if (result !== true) {
              validationError.value = typeof result === 'string' ? result : rule.message || 'Invalid input';
              emit('validate', false);
              return false;
            }
          } catch (error) {
            validationError.value = rule.message || 'Validation error';
            emit('validate', false);
            return false;
          }
        }
        
        if (rule.pattern && props.modelValue) {
          const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
          if (!pattern.test(String(props.modelValue))) {
            validationError.value = rule.message || 'Invalid format';
            emit('validate', false);
            return false;
          }
        }
        
        if (rule.min !== undefined && props.modelValue !== undefined && props.modelValue !== null) {
          if (typeof props.modelValue === 'string' && props.modelValue.length < rule.min) {
            validationError.value = rule.message || `Minimum length is ${rule.min} characters`;
            emit('validate', false);
            return false;
          } else if (typeof props.modelValue === 'number' && props.modelValue < rule.min) {
            validationError.value = rule.message || `Minimum value is ${rule.min}`;
            emit('validate', false);
            return false;
          }
        }
        
        if (rule.max !== undefined && props.modelValue !== undefined && props.modelValue !== null) {
          if (typeof props.modelValue === 'string' && props.modelValue.length > rule.max) {
            validationError.value = rule.message || `Maximum length is ${rule.max} characters`;
            emit('validate', false);
            return false;
          } else if (typeof props.modelValue === 'number' && props.modelValue > rule.max) {
            validationError.value = rule.message || `Maximum value is ${rule.max}`;
            emit('validate', false);
            return false;
          }
        }
      }
      
      emit('validate', true);
      return true;
    };
    
    // Handle hidden input
    if (props.type === 'hidden') {
      watch(() => props.value, () => {
        emit('update:modelValue', props.value);
      }, { immediate: true })
    }
    
    // Validate on trigger
    watch(() => props.modelValue, () => {
      if (props.validationTrigger === 'change') {
        validate();
      }
    });
    
    // Validate on mount if requested
    if (props.validateOnMount) {
      nextTick(validate);
    }
    
    return {
      validationError,
      validated,
      validate,
      maskedInputRef,
      displayValue,
      getMaskMaxLength,
      maskedListeners,
      listeners: {
        input: (event) => {
          emit('input', event);
          emit('update:modelValue', event);
        },
        change: (event) => {
          emit('change', event);
          if (props.validationTrigger === 'change') {
            validate();
          }
        },
        blur: () => {
          if (props.validationTrigger === 'blur') {
            validate();
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.form-input-container {
  width: 100%;
  transition: all 0.2s ease-in-out;
}

.asset-upload {
  width: 100%;
  clear: both;
}

.label-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-icon {
  color: var(--el-color-info);
  font-size: 16px;
  cursor: help;
}

.help-text-container {
  margin-top: 4px;
}

.help-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.description {
  display: block;
  margin-top: 4px;
  font-style: italic;
}

.validation-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: var(--el-color-danger);
  font-size: 11px;
  line-height: 1.3;
  opacity: 0.9;
}

.error-icon {
  font-size: 12px;
}

.validation-success {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: var(--el-color-success);
  font-size: 12px;
  line-height: 1.4;
}

.success-icon {
  font-size: 14px;
}

/* Transitions for validation messages and other elements */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Smooth transitions for all interactive elements */
:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select .el-input__wrapper),
:deep(.el-input-number .el-input__wrapper),
:deep(.el-color-picker__trigger),
:deep(.el-switch__core) {
  transition: all 0.2s ease-in-out;
}

/* Pulse animation for validation success */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.validation-success .success-icon {
  animation: pulse 0.5s ease-in-out;
}

.has-help :deep(.el-form-item__label) {
  margin-bottom: 0;
}

/* Custom styling for error and success states with transitions */
.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) !important;
  transition: box-shadow 0.2s ease;
}

.is-error :deep(.el-textarea__inner) {
  border-color: var(--el-color-danger);
  transition: border-color 0.2s ease;
}

.is-error :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-danger-dark-2) !important;
}

.is-success :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-success) !important;
  transition: box-shadow 0.2s ease;
}

.is-success :deep(.el-textarea__inner) {
  border-color: var(--el-color-success);
  transition: border-color 0.2s ease;
}

.is-success :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-success-dark-2) !important;
}

/* Shake animation for validation errors */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}

.is-error :deep(.el-input__wrapper),
.is-error :deep(.el-textarea__inner) {
  animation: shake 0.5s ease-in-out;
}

/* Improve focus states for accessibility */
:deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
}

:deep(.el-textarea.is-focus .el-textarea__inner) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* Hover effects for inputs */
:deep(.el-input:not(.is-disabled) .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover) !important;
  transition: box-shadow 0.2s ease;
}

:deep(.el-textarea:not(.is-disabled) .el-textarea__inner:hover) {
  border-color: var(--el-border-color-hover);
  transition: border-color 0.2s ease;
}

/* Subtle scale effect on focus for better feedback */
:deep(.el-input.is-focus .el-input__wrapper),
:deep(.el-textarea.is-focus .el-textarea__inner),
:deep(.el-select:focus-within .el-input__wrapper),
:deep(.el-input-number:focus-within .el-input__wrapper) {
  transform: translateY(-0.5px);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

:deep(.el-select:focus-within .el-input__wrapper),
:deep(.el-input-number:focus-within .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) !important;
}

/* Color picker focus state */
:deep(.el-color-picker:focus-within .el-color-picker__trigger) {
  border-color: var(--el-color-primary);
}

/* Remove default focus outlines since we're providing our own */
:deep(.el-input__inner:focus),
:deep(.el-textarea__inner:focus) {
  outline: none;
}

/* Fix the switch focus state */
:deep(.el-switch:focus-visible .el-switch__core) {
  outline: 1px solid var(--el-color-primary);
  outline-offset: 1px;
}

/* Override Element Plus default focus styles */
:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) !important;
}

/* Responsive adjustments with improved touch interactions */
@media (max-width: 768px) {
  .label-container {
    flex-wrap: wrap;
  }
  
  /* Larger touch targets on mobile */
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select .el-input__wrapper),
  :deep(.el-input-number .el-input__wrapper),
  :deep(.el-color-picker__trigger) {
    min-height: 44px; /* Apple's recommended minimum touch target size */
  }
  
  :deep(.el-input__inner) {
    font-size: 16px; /* Prevents iOS zoom on input focus */
  }
  
  /* Prevent the subtle scale effect on mobile to avoid layout shifts */
  :deep(.el-input.is-focus .el-input__wrapper),
  :deep(.el-textarea.is-focus .el-textarea__inner),
  :deep(.el-select:focus-within .el-input__wrapper),
  :deep(.el-input-number:focus-within .el-input__wrapper) {
    transform: none;
  }
}

/* Loading state styling */
:deep(.is-loading .el-input__wrapper) {
  background-color: var(--el-fill-color-light);
}

/* Character counter styling */
:deep(.el-input__count) {
  background: transparent;
  font-size: 12px;
}

/* Mask hint styling */
.mask-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 0 8px;
  white-space: nowrap;
}

/* Help popover content styling */
.help-popover-content {
  font-size: 14px;
  line-height: 1.5;
}

.help-popover-content p {
  margin-top: 0;
  margin-bottom: 10px;
}

.help-popover-content p:last-child {
  margin-bottom: 0;
}

:deep(.form-input-help-popover) {
  max-width: 90vw;
}
</style>
