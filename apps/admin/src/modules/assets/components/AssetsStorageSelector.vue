<template>
  <div class="select-storage">
    <label>{{ t('Storage') }}:</label>
    <el-select @update:model-value="change" :model-value="selected" class="storage-selection">
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
import { nextTick, watch, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStorageList } from '../compositions/storages'
import { useModelChange } from '../../core/compositions/model-change'

const { t } = useI18n();
const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits(['update:modelValue']);

const { items, loaded } = useStorageList()
const { selected, change } = useModelChange(ref(props.modelValue), items, emit);

const unwatch = watch(loaded, () => {
  if (loaded.value) {
    if (items.value.length === 1) {
      change(items.value[0])
    }
    nextTick(() => unwatch())
  }
}, { immediate: true });
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
