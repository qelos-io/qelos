<template>
  <h1>{{ t(title) }}
    <template v-if="itemName">: <i>{{ itemName }}</i></template>
  </h1>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineProps<{title: string, itemName: string}>()
const { t } = useI18n();
</script>

<style scoped>
h1 i {
  color: var(--main-color);
}
</style>
