<template>
  <div class="palette">
    <div class="color-wrapper" v-for="(title, key) in ColorName" :key="key">
      <ColorPicker :model-value="colors[key]" @update:modelValue="updateColor(key, $event)"/>
      <div v-if="inputState[key] !== 'input'" @dblclick="inputState[key] = 'input'">{{ t(title) }}</div>
      <input v-else v-model="colors[key]" @change="emit('update:modelValue', colors)" autofocus
             @focusout="clearState(key)"
             @blur="clearState(key)"
             @keyup.enter="clearState(key)"
             @keyup.esc="clearState(key)"
             class="flex-1"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { ColorName } from '@/modules/configurations/types/colors-palette';
import ColorPicker from 'primevue/colorpicker';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

function clearState(key) {
  inputState[key] = '';
}

const props = defineProps({
  modelValue: Object as () => Record<string, string>,
})

const inputState = reactive({});

const colors = ref({
  mainColor: '',
  mainColorLight: props.modelValue?.mainColor || '',
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

function updateColor(key: string, value: string) {
  if (colors[key] === '#' + value) {
    return;
  }

  colors.value[key] = '#' + value;
  emit('update:modelValue', colors.value);
}

</script>

<style scoped>
.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  width: 24%;
}

.color-wrapper :deep(input) {
  width: 48px;
  height: 48px;
  border-radius: calc(var(--border-radius) * 0.8);
  border: 1px solid var(--border-color);
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
    gap: 8px;
  }

  .color-wrapper {
    width: auto;
    min-width: 0;
    flex-shrink: 1;
  }
  
  .color-wrapper :deep(input) {
    width: 40px;
    height: 40px;
  }
}
</style>