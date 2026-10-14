<template>
  <BlockWorkspace ref="workspace" :block="{}" :submitting="submitting" @submitted="submit" />
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import BlockWorkspace from './components/BlockWorkspace.vue'
import { removeUnsavedChanges } from '../drafts/compositions/unsaved-changes'
import blocksService from '../../services/apis/blocks-service'
import { useBlocksList } from './store/blocks-list'

const { retry } = useBlocksList()
const router = useRouter()
const submitting = ref(false)
const workspace = ref<InstanceType<typeof BlockWorkspace>>()

async function submit(data) {
  if (!data.name) {
    ElMessage.warning('Please provide a name for the content box')
    return
  }

  submitting.value = true
  try {
    const { _id } = await blocksService.create(data)
    workspace.value?.markSaved()
    removeUnsavedChanges('block')
    ElMessage.success('Content box created successfully')
    retry()
    // keep working on the box that was just created
    router.replace({ name: 'editBlock', params: { blockId: _id } })
  } catch (error) {
    console.error('Failed to create block:', error)
    ElMessage.error('Failed to create the content box')
  } finally {
    submitting.value = false
  }
}
</script>
