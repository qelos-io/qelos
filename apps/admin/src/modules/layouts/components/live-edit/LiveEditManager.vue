<script setup lang="ts">
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import { ref, toRefs, watch } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { isAdmin } from '@/modules/core/store/auth';
import ColorPicker from 'primevue/colorpicker';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';

const { isOpen, editing, cancelEdit, submitEdit } = toRefs(useLiveEditStore());


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
      <FormRowGroup>
        <div class="flex-0">
          <ColorPicker v-if="model" :model-value="model" @update:modelValue="model = '#' + $event" inline/>
        </div>
        <FormInput :title="$t('Or enter a valid CSS color:')" v-model="model" type="text"/>
      </FormRowGroup>
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