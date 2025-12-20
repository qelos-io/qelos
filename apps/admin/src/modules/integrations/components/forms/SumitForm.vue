<template>
  <el-form @submit.prevent="submit">
    <el-form-item :label="$t('API Key')">
      <el-input
        v-model="form.authentication.apiKey"
        type="password"
        required
      />
    </el-form-item>
    <div class="d-flex justify-content-end">
      <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
      <el-button type="primary" @click="submit">{{ $t('Save') }}</el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElForm, ElFormItem, ElInput, ElButton } from 'element-plus';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue', 'submit', 'close']);

const form = ref(props.modelValue);

const submit = () => {
  emit('submit', form.value);
};
</script>
