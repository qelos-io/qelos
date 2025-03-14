<template>
  <div v-if="type !== 'hidden'">
    <EditComponentBar v-if="isEditingEnabled"/>
    <el-form-item :label="title ? $t(title) : null" :required="required">
      <small v-if="label"> ({{ $t(label) }})</small>
      <small v-else-if="gap">&nbsp;</small>
      <slot name="pre"/>
      <el-input-number v-if="type === 'number'" v-on="listeners" :size="size || 'large'"
                       :model-value="modelValue as number"/>
      <el-switch
          v-else-if="type === 'switch'"
          v-model="modelValue as boolean"
          v-on="listeners"
          :size="size || 'large'"
          inline-prompt
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
          active-text="Y"
          inactive-text="N"
      />
      <el-select v-else-if="type === 'select'" :model-value="modelValue as any" :placeholder="placeholder"
                 :size="size || 'large'"
                 :native-type="type"
                 :disabled="disabled"
                 v-on="listeners"
                 v-bind="selectOptions"
                 @update:model-value="$emit('update:modelValue', $event)"
                 :required="required">
        <template v-if="options?.length">
          <el-option v-for="(option, index) in options"
                     :key="option[optionValue] || option.identifier || option._id || index"
                     :label="option[optionLabel] || option.name || option.title || option.label || option.metadata?.title || option"
                     :value="option[optionValue] || option.identifier || option._id"/>
        </template>
        <slot name="options"/>
      </el-select>
      <AssetUploader v-else-if="type === 'upload' || type === 'file'" v-on="listeners" :value="modelValue"
                     @change="$emit('update:modelValue', $event)" class="asset-upload"/>
      <el-input v-else v-on="listeners" :model-value="modelValue as (string | number)" :placeholder="placeholder"
                :size="size || 'large'"
                :native-type="type"
                :disabled="disabled"
                :required="required"
                :type="type"/>
    </el-form-item>
    <slot/>
  </div>
  <div v-else-if="isEditingEnabled">
    <EditComponentBar/>
  </div>
</template>

<script lang="ts">
import { watch } from 'vue';
import AssetUploader from '@/modules/assets/components/AssetUploader.vue'
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';
import { isEditingEnabled } from '@/modules/core/store/auth';

export default {
  name: 'FormInput',
  computed: {
    isEditingEnabled() {
      return isEditingEnabled
    }
  },
  components: { EditComponentBar, AssetUploader },
  props: {
    title: String,
    label: String,
    type: String as () => 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'email' | 'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'select' | 'hidden',
    placeholder: String,
    gap: Boolean,
    size: String as () => 'large' | 'default' | 'small',
    modelValue: [String, Number, Object, Boolean],
    disabled: Boolean,
    required: Boolean,
    options: Array as () => any[],
    optionValue: String,
    optionLabel: String,
    selectOptions: {
      type: Object,
      default: () => ({})
    },
    value: [String, Number, Object, Boolean],
  },
  emits: ['input', 'change', 'update:modelValue'],
  setup(props, { emit }) {
    if (props.type === 'hidden') {
      watch(() => props.value, () => {
        emit('update:modelValue', props.value);
      }, { immediate: true })
    }
    return {
      listeners: {
        input: (event) => {
          emit('input', event);
          emit('update:modelValue', event)
        },
        change: (event) => emit('change', event)
      }
    }
  }
}
</script>

<style scoped>
.asset-upload {
  clear: both;
}
</style>
