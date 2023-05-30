<template>
  <div>
    <div class="color-wrapper" v-for="(title, key) in ColorName" :key="key"><FormInput :title="title" v-model="colors[key]" type="color"/></div>
  </div>
</template>

<script lang="ts" setup>
import {reactive, watch} from 'vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import {ColorName} from '@/modules/configurations/types/colors-palette';

const props = defineProps({
  modelValue: Object as () => Record<string, string>,
})

const colors = reactive({
  mainColor: '',
  textColor: '',
  secondaryColor: '',
  thirdColor: '',
  bgColor: '',
  bordersColor: '',
  linksColor: '',
  navigationBgColor: '',
  negativeColor: '',
  inputsTextColor: '',
  inputsBgColor: '',
  ...props.modelValue,
});

const emit = defineEmits(['update:modelValue'])

watch(colors, () => {
  emit('update:modelValue', colors);
})

</script>

<style scoped>
.color-wrapper /deep/ .el-form-item__content {
  max-width: 100px;
}
</style>