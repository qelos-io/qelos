<script setup lang="ts">
import {useLiveEditStore} from '@/modules/layouts/store/live-edit';
import {ref, toRefs, watch} from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import {isAdmin} from '@/modules/core/store/auth';

const {isOpen, editing, cancelEdit, submitEdit} = toRefs(useLiveEditStore());

const model = ref()
const isActuallyOpen = ref(false);

watch(isOpen, () => {
  isActuallyOpen.value = isOpen.value;
  model.value = editing.value.currentValue;
})

watch(isActuallyOpen, () => {
  if (!isActuallyOpen.value) {
    cancelEdit.value();
  }
})
</script>

<template>
  <template v-if="isAdmin">
    <el-dialog v-model="isActuallyOpen" :title="'Edit Palette Color: ' + editing.keyName">
      <FormInput v-model="model" type="color"/>
      <FormInput :title="$t('Or enter a valid CSS color:')" v-model="model" type="text"/>
      <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancelEdit">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="submitEdit(model)">{{ $t('Submit') }}</el-button>
      </span>
      </template>
    </el-dialog>
  </template>
</template>

<style scoped>

</style>