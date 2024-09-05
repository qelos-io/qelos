import { onUnmounted, Ref, watch } from 'vue';

export function useGlobalStyles(styles: Ref<string[]>) {
  const styleTag = document.createElement('style');
  document.body.appendChild(styleTag);

  watch(styles, (styles) => {
    styleTag.innerHTML = styles?.join('\n');
  }, { immediate: true });

  onUnmounted(() => {
    styleTag?.remove();
  });
}