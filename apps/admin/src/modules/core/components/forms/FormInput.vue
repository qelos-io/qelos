<template>
  <div>
    <EditComponentBar/>
    <el-form-item :label="title ? $t(title) : null" :required="required">
      <small v-if="label"> ({{ $t(label) }})</small>
      <small v-else-if="gap">&nbsp;</small>
      <slot name="pre"/>
      <el-input-number v-if="type === 'number'" v-on="listeners" :size="size || 'large'" :model-value="modelValue as number"/>
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
      </el-select>
      <AssetUploader v-else-if="type === 'upload'" v-on="listeners" :value="modelValue" class="asset-upload"/>
      <el-input v-else v-on="listeners" :model-value="modelValue as (string | number)" :placeholder="placeholder"
                :size="size || 'large'"
                :native-type="type"
                :disabled="disabled"
                :required="required"
                :type="type"/>
    </el-form-item>
    <slot/>
  </div>
</template>

<script lang="ts">
import AssetUploader from '@/modules/assets/components/AssetUploader.vue'
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';

export default {
  name: 'FormInput',
  components: { EditComponentBar, AssetUploader },
  props: {
    title: String,
    label: String,
    type: String as () => 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'select',
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
  },
  emits: ['input', 'change', 'update:modelValue'],
  setup(_, { emit }) {
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
