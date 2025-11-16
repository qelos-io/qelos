<script setup lang="ts">
import { ref, watch } from 'vue';

import { useBlocksList } from '../store/blocks-list';
import BlockForm from './BlockForm.vue'
import { IBlock } from '@/services/types/block';

import blocksService from '@/services/apis/blocks-service';

const props = defineProps<{ title?: string, editable?: boolean }>()

const model = defineModel('modelValue', {
  type: String,
  default: ''
})

const store = useBlocksList();

const editableBlock = ref<IBlock | null>(null);
const showEditDialog = ref(false);
const submitting = ref(false);
// Watch for changes in the selected block ID
watch(model, async (newValue) => {
  if (newValue && props.editable) {
    // Clear previous block
    editableBlock.value = null;
  }
});

// Function to load and edit the selected block
const editSelectedBlock = async () => {
  if (!model.value) return;
  
  try {
    // Fetch the block data
    editableBlock.value = await blocksService.getOne(model.value);
    showEditDialog.value = true;
  } catch (error) {
    console.error('Failed to load block for editing:', error);
  }
};

// Handle form submission
const handleSubmit = async (updatedBlock) => {
  if (!editableBlock.value?._id) return;
  
  submitting.value = true;
  try {
    // Update the block
    await blocksService.update(editableBlock.value._id, updatedBlock);

    store.retry();
    
    // Close the dialog
    showEditDialog.value = false;
    editableBlock.value = null;
  } catch (error) {
    console.error('Failed to update block:', error);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <el-form-item>
      <template #label>
        {{ $t(props.title || 'Content Box') }}
      </template>
      <div class="select-with-actions">
        <el-select v-model="model" filterable class="block-select">
          <el-option :label="`(${$t('none')})`" value=""/>
          <el-option v-for="(block) in store.blocks"
                    :key="block._id"
                    :label="block.name"
                    :value="block._id"/>
        </el-select>
        <el-button 
          v-if="props.editable && model" 
          type="primary" 
          size="small" 
          icon="icon-edit" 
          circle
          @click="editSelectedBlock"
          :title="$t('Edit selected block')"
        />
      </div>
    </el-form-item>
    
    <!-- Edit Dialog -->
    <el-dialog 
      v-model="showEditDialog" 
      :title="$t('Edit Block')" 
      top="2%"
      width="80%"
      destroy-on-close
    >
      <BlockForm 
        v-if="editableBlock" 
        :block="editableBlock" 
        :submitting="submitting" 
        @submitted="handleSubmit"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.select-with-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.block-select {
  flex: 1;
}
</style>