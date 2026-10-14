<template>
  <div v-if="loading" class="loading">
    <el-skeleton animated :rows="6" />
  </div>

  <BlockWorkspace v-else-if="block" :key="block._id" :block="block" :submitting="submitting" @submitted="handleUpdate" />

  <el-empty v-else :description="$t('Content box not found')" :image-size="160">
    <el-button type="primary" @click="router.push({ name: 'blocks' })">{{ $t('Back to content boxes') }}</el-button>
  </el-empty>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { useEditBlock } from './compositions/blocks'
import { useBlocksList } from './store/blocks-list'
import BlockWorkspace from './components/BlockWorkspace.vue'

const router = useRouter()
const blockId = useRoute().params.blockId as string
const { block, submitting, updateBlock, loading } = useEditBlock(blockId)
const { retry } = useBlocksList()

async function handleUpdate(data) {
  try {
    await updateBlock(data)
    retry()
  } catch (error) {
    console.error('Failed to update block:', error)
  }
}
</script>
<style scoped>
.loading {
  padding: 24px;
}
</style>
