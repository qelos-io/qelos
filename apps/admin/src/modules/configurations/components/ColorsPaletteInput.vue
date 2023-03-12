<template>
  <div>
    <div class="color-wrapper"><FormInput title="Main Color" v-model="colors.mainColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Secondary Color" v-model="colors.secondaryColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Negative Color" v-model="colors.negativeColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Background Color" v-model="colors.bgColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Inputs Text Color" v-model="colors.inputsTextColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Inputs Background" v-model="colors.inputsBgColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Borders Color" v-model="colors.bordersColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Links Color" v-model="colors.linksColor" type="color"/></div>
    <div class="color-wrapper"><FormInput title="Navigation Background Color" v-model="colors.navigationBgColor" type="color"/></div>
  </div>
</template>

<script lang="ts" setup>
import {reactive, watch} from 'vue';
import FormInput from '../../core/components/forms/FormInput.vue';

const props = defineProps({
  modelValue: Object as () => Record<string, string>,
})

const colors = reactive({
  mainColor: '',
  secondaryColor: '',
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