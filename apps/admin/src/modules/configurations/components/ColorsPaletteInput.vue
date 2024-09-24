<template>
  <div class="palette">
    <div class="color-wrapper" v-for="(title, key) in ColorName" :key="key">
      <ColorPicker :model-value="colors[key]" @update:modelValue="updateColor(key, $event)"/>
      <div>{{ t(title) }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ColorName } from '@/modules/configurations/types/colors-palette';
import ColorPicker from 'primevue/colorpicker';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: Object as () => Record<string, string>,
})

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
  console.log(value)

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
  border-radius: 4px;
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
  }

  .color-wrapper {
    width: auto;
  }
}
</style>