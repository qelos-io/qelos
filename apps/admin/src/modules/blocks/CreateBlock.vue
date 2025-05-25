<template>
  <div class="block-page">
    <div class="page-header">
      <div class="page-title">
        <h1>Create Block</h1>
        <p class="page-description">Create a new HTML content block for use in templates</p>
      </div>
      <div class="page-actions">
        <el-button @click="router.push({ name: 'blocks' })" icon="icon-arrow-left">Back to Blocks</el-button>
      </div>
    </div>
    
    <el-card class="block-card" shadow="hover">
      <BlockForm :block="{}" @submitted="submit" :submitting="submitting" />
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import BlockForm from './components/BlockForm.vue'
import { removeUnsavedChanges } from '../drafts/compositions/unsaved-changes'
import blocksService from '../../services/blocks-service'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBlocksList } from './store/blocks-list'

const {retry} = useBlocksList()

const router = useRouter()
const submitting = ref(false)

async function submit(data) {
  if (!data.name) {
    ElMessage.warning('Please provide a name for the block')
    return
  }
  
  submitting.value = true
  try {
    const { _id } = await blocksService.create(data)
    removeUnsavedChanges('block')
    ElMessage.success('Block created successfully')

    retry();
    
    // Ask if user wants to continue editing or go back to list
    await ElMessageBox.confirm(
      'Block created successfully. Would you like to continue editing it?',
      'Success',
      {
        confirmButtonText: 'Continue Editing',
        cancelButtonText: 'Back to Blocks List',
        type: 'success',
      }
    )
    .then(() => {
      // User chose to continue editing
      router.push({
        name: 'editBlock',
        params: { blockId: _id }
      })
    })
    .catch(() => {
      // User chose to go back to list
      router.push({ name: 'blocks' })
    })
  } catch (error) {
    console.error('Failed to create block:', error)
    ElMessage.error('Failed to create block. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.block-page {
  padding: 0 16px 32px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.95rem;
}

.block-card {
  margin-bottom: 24px;
}

.block-card :deep(.el-card__body) {
  padding: 0;
}
</style>
