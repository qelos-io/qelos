<template>
  <div class="select-storage">
    <label>{{ t('Storage') }}:</label>
    <el-select v-model="model" class="storage-selection">
      <el-option
          v-for="item in items"
          :key="item._id"
          :value="item._id"
          :label="item.name"
      />
    </el-select>
  </div>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { useStorageList } from '../compositions/storages'

const { t } = useI18n();
const model = defineModel();

const { items, promise } = useStorageList()

promise.then(() => {
  if (items.value.length === 1) {
    model.value = items.value[0]._id
  }
})
</script>
<style scoped>
.select-storage {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.storage-selection {
  padding-inline-start: 10px;
  flex: 1;
}
</style>
