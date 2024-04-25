<template>
  <div class="palette">
    <div class="color-wrapper" v-for="(title, key) in ColorName" :key="key">
      <FormInput :title="title" v-model="colors[key]" type="color"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { ColorName } from '@/modules/configurations/types/colors-palette';

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
.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.color-wrapper {
  width: 24%;
}
@media (max-width: 1024px) {
  .color-wrapper {
    width: 31%;
  }
}
@media (max-width: 768px) {
  .color-wrapper {
    width: 47%;
  }
}

@media (max-width: 480px) {
  .palette {
    flex-direction: row;
  }
  .color-wrapper {
    width: auto;
  }
}

.color-wrapper /deep/ .el-form-item {
  justify-content: center;
  align-items: center;
}
.color-wrapper /deep/ .el-form-item__content {
  width: 100%;
}
.color-wrapper /deep/ .el-form-item__label {
  padding: 0 12px;
}
.color-wrapper /deep/ input {
  cursor: pointer;
}

.color-wrapper /deep/ .el-form-item__content {
  max-width: 100px;
}
</style>