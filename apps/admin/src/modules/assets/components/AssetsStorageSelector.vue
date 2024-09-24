<template>
  <div class="select-storage">
    <label>{{ t('Storage') }}:</label>
    <el-select @change="change" :model-value="selected" class="storage-selection">
      <el-option
          v-for="item in items"
          :key="item._id"
          :value="item"
          :label="item.name"
      />
    </el-select>
  </div>
</template>
<script lang="ts" setup>
import { useStorageList } from '../compositions/storages'
import { useModelChange } from '../../core/compositions/model-change'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{ value?: string }>()
const emit = defineEmits(['change']);

const { items } = useStorageList()
const { selected, change } = useModelChange(props.value, items, emit);
</script>
<style scoped>
.select-storage {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.storage-selection {
  padding-left: 10px;
  flex: 1;
}
</style>
