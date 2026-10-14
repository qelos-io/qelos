<template>
  <StorageEditor :initial-kind="kind" :submitting="submitting" @submitted="onSubmitted">
    <template #aside>
      <StorageConnectionPanel />
    </template>
  </StorageEditor>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import StorageEditor from './components/StorageEditor.vue'
import StorageConnectionPanel from './components/StorageConnectionPanel.vue'
import { useSubmitting } from '../core/compositions/submitting'
import { addStorage } from '@/modules/assets/store/storages'

const route = useRoute()
const router = useRouter()
const kind = route.query.kind as string | undefined

let testAfterCreate = false
const { submitting, submit } = useSubmitting(
    async function onCreate(data) {
      const storage = await addStorage(data)
      await router.push({
        name: 'editStorage',
        params: { storageId: storage._id },
        query: testAfterCreate ? { test: '1' } : undefined
      })
    },
    {
      success: 'Storage created successfully',
      error: 'Failed to create storage'
    }
)

function onSubmitted(payload: Record<string, any>, { test }: { test: boolean }) {
  testAfterCreate = test
  return submit(payload)
}
</script>
