<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const props = defineProps<{ tag?: string, text?: string, icon?: string[], value: string }>()
const text = computed(() => props.text || 'Copy link')

function copyToClipboard() {
  navigator.clipboard.writeText(props.value);
  ElMessage.info({
    message: t('Copied to clipboard'),
    type: 'info',
    center: true,
    customClass: 'copy-to-clipboard-message'
  })
}
</script>

<template>
  <component :is="tag || 'a'" @click.prevent="copyToClipboard">
    <font-awesome-icon :icon="icon || ['fas', 'link']"></font-awesome-icon>
    <slot v-if="$slots.default"/>
    <span v-else>{{ $t(text) }}</span>
  </component>
</template>

<style>
.copy-to-clipboard-message {
  top: auto !important;
  bottom: 20px;
}
</style>