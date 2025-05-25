<template>
  <div class="block-page">
    <div v-if="loading" class="loading-container">
      <el-skeleton style="width: 100%" animated>
        <template #template>
          <div style="padding: 16px;">
            <el-skeleton-item variant="p" style="width: 50%" />
            <el-skeleton-item variant="text" style="margin-top: 16px; width: 80%" />
            <el-skeleton-item variant="text" style="margin-top: 16px; width: 80%" />
            <el-skeleton-item variant="text" style="margin-top: 16px; width: 60%" />
          </div>
        </template>
      </el-skeleton>
    </div>

    <template v-else-if="block">
      <div class="page-header">
        <div class="page-title">
          <h1>Edit Block: {{ block.name }}</h1>
          <p class="page-description">Modify the HTML content block</p>
        </div>
        <div class="page-actions">
          <el-button @click="router.push({ name: 'blocks' })" icon="icon-arrow-left">Back to Blocks</el-button>
        </div>
      </div>
      
      <el-card class="block-card" shadow="hover">
        <BlockForm :block="block" :submitting="submitting" @submitted="handleUpdate" />
      </el-card>
    </template>

    <el-empty v-else description="Block not found" :image-size="200">
      <el-button type="primary" @click="router.push({ name: 'blocks' })">Back to Blocks List</el-button>
    </el-empty>
  </div>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import { useEditBlock } from './compositions/blocks'
import BlockForm from './components/BlockForm.vue'

const router = useRouter()
const blockId = useRoute().params.blockId as string
const { block, submitting, updateBlock, loading } = useEditBlock(blockId)

// Check if block exists after it's loaded
const blockExists = computed(() => !!block.value)

async function handleUpdate(data) {
  try {
    await updateBlock(data)
  } catch (error) {
    console.error('Failed to update block:', error)
  }
}
</script>

<style scoped>
.block-page {
  padding: 0 16px 32px;
}

.loading-container {
  padding: 24px;
  background-color: var(--el-fill-color-blank);
  border-radius: 4px;
  margin-top: 24px;
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
