<template>
  <div class="footer-actions" :class="{ 'has-cancel': showCancel }" :style="{ backgroundColor }" role="group" :aria-label="ariaLabel">
    <el-button 
      v-if="showCancel"
      @click="handleCancel"
    >
      {{ cancelText || $t('Cancel') }}
    </el-button>
    
    <el-button 
      type="primary" 
      @click="handleSave" 
      :loading="loading"
      :disabled="loading || disabled"
      :native-type="nativeType"
      :aria-label="buttonAriaLabel"
      :aria-busy="loading"
    >
      {{ buttonText || $t('Save Changes') }}
    </el-button>
    
    <slot name="extra-buttons"></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loading?: boolean
  disabled?: boolean
  buttonText?: string
  cancelText?: string
  showCancel?: boolean
  ariaLabel?: string
  buttonAriaLabel?: string
  nativeType?: 'submit' | 'button' | 'reset'
  backgroundColor?: string
}

interface Emits {
  (e: 'save'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false
})

const emit = defineEmits<Emits>()

const handleSave = () => {
  if (!props.loading && !props.disabled) {
    emit('save')
  }
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.footer-actions {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  margin-top: 1rem;
}

.footer-actions.has-cancel {
  justify-content: flex-start;
  gap: 8px;
}

@media (max-width: 768px) {
  .footer-actions.has-cancel {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
