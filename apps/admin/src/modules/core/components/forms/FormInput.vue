<template>
  <div>
    <el-form-item :label="title ? $t(title) : null">
      <small v-if="label"> ({{ $t(label) }})</small>
      <small v-else-if="gap">&nbsp;</small>
      <slot name="pre"/>
      <el-input-number v-if="type === 'number'" v-on="listeners" :model-value="modelValue as number"/>
      <el-switch
          v-else-if="type === 'switch'"
          v-model="modelValue as boolean"
          v-on="listeners"
          inline-prompt
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
          active-text="Y"
          inactive-text="N"
      />
      <AssetUploader v-else-if="type === 'upload'" v-on="listeners" :value="modelValue" class="asset-upload"/>
      <el-input v-else v-on="listeners" :model-value="modelValue as (string | number)" :placeholder="placeholder"
                size="large"
                :native-type="type"
                :type="type"/>
    </el-form-item>
    <slot/>
  </div>
</template>

<script lang="ts">
import AssetUploader from '@/modules/assets/components/AssetUploader.vue'

export default {
  name: 'FormInput',
  components: { AssetUploader },
  props: {
    title: String,
    label: String,
    type: String as () => 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'number' | 'radio' | 'upload' | 'switch' | 'color',
    placeholder: String,
    gap: Boolean,
    modelValue: [String, Number, Object, Boolean]
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
