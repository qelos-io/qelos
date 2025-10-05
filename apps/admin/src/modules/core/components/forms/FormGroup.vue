<template>
  <div 
    class="form-group"
    :class="{
      [`form-group--${direction}`]: true,
      'form-group--labeled': !!label,
      [`form-group--label-${labelPosition}`]: !!label,
      'form-group--bordered': bordered,
      'form-group--compact': compact
    }"
  >
    <div v-if="label" class="form-group__label">
      <span>{{ $t(label) }}</span>
      <el-tooltip v-if="tooltip" :content="$t(tooltip)" placement="top">
        <el-icon class="tooltip-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>
    
    <div class="form-group__content">
      <slot />
    </div>
    
    <div v-if="helpText" class="form-group__help">
      <small>{{ $t(helpText) }}</small>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';

export default defineComponent({
  name: 'FormGroup',
  components: {
    QuestionFilled
  },
  props: {
    // Group properties
    label: String,
    tooltip: String,
    helpText: String,
    direction: {
      type: String,
      default: 'row',
      validator: (value: string) => ['row', 'column'].includes(value)
    },
    labelPosition: {
      type: String,
      default: 'top',
      validator: (value: string) => ['top', 'side'].includes(value)
    },
    bordered: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    },
    id: String
  }
});
</script>

<style scoped>
.form-group {
  margin-bottom: 1.5rem;
  width: 100%;
}

.form-group__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 0.5rem;
}

.form-group__content {
  display: flex;
  gap: 1rem;
}

.form-group__help {
  margin-top: 0.5rem;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* Direction styles */
.form-group--row .form-group__content {
  flex-direction: row;
  flex-wrap: wrap;
}

.form-group--column .form-group__content {
  flex-direction: column;
}

/* Label position styles */
.form-group--label-side {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.form-group--label-side .form-group__label {
  flex: 0 0 25%;
  margin-bottom: 0;
  padding-top: 0.5rem;
}

.form-group--label-side .form-group__content {
  flex: 1;
}

/* Bordered style */
.form-group--bordered {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 1rem;
  background-color: var(--el-fill-color-light);
}

/* Compact style */
.form-group--compact {
  margin-bottom: 0.75rem;
}

.form-group--compact .form-group__content {
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .form-group--label-side {
    flex-direction: column;
  }
  
  .form-group--label-side .form-group__label {
    flex: 0 0 100%;
    margin-bottom: 0.5rem;
  }
  
  .form-group--row .form-group__content {
    flex-direction: column;
  }
}

.tooltip-icon {
  color: var(--el-color-info);
  font-size: 16px;
  cursor: help;
}
</style>
