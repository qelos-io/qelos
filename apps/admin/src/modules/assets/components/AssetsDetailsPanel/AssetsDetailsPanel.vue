<template>
  <div :class="isOpen ? 'panel open' : 'panel'" :dir="t('appDirection')">
    <a @click="togglePanel" class="toggle">
      <el-icon>
        <icon-arrow-right v-if="isOpen"/>
        <icon-arrow-left v-else/>
      </el-icon>
    </a>
    <div class="content">
      <AssetsStorageSelector v-model="selectedStorage"/>
      <template v-if="selectedStorage">
        <BasicFileUploader :storage="selectedStorage"/>
        <BasicAssetsList :storage="selectedStorage"/> 
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n';
import AssetsStorageSelector from '../AssetsStorageSelector.vue'
import BasicFileUploader from '../BasicFileUploader.vue'
import BasicAssetsList from './BasicAssetsList.vue'

const { t } = useI18n();

const isOpen = ref(false)
const selectedStorage = ref<string>()

const togglePanel = () => isOpen.value = !isOpen.value
</script>
<style scoped lang="scss">
.panel {
  position: fixed;
  z-index: 2;
  inset-block-start: 130px;
  inset-inline-end: -400px;
  width: 400px;
  height: 70%;
  max-width: 50%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  transition: inset-inline-end 0.3s ease-in-out;

  &[dir="rtl"] {
    inset-inline-start: -400px;
    inset-inline-end: auto;
    transition: inset-inline-start 0.3s ease-in-out;

    .toggle {
      border-radius: 0 8px 8px 0;
    }
  }

  &.open {
    inset-inline-end: 0;

    &[dir="rtl"] {
      inset-inline-end: auto;
      inset-inline-start: 0;
    }
  }

  .toggle {
    cursor: pointer;
    margin-block-start: 200px;
    margin-inline-start: -20px;
    width: 20px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px 0 0 8px;
    text-decoration: none;
    background-color: #ddd;
    transition: background-color 0.2s ease-in-out;
  }
}

.toggle:hover {
  background-color: #ccc;
}

.content {
  background-color: #eee;
  align-self: stretch;
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  width: 100%;
}

.content > * {
  margin: 10px;
}

.assets-list {
  flex: 1;
}
</style>
