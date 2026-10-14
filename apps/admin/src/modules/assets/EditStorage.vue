<template>
  <StorageEditor v-if="!data.loading" :storage="data.storage" :submitting="submitting" @submitted="onSubmitted">
    <template #aside="{ dirty }">
      <StorageConnectionPanel :storage-id="storageId" :kind="data.storage.kind" :dirty="dirty" />
    </template>
  </StorageEditor>
  <el-skeleton v-else class="loading" :rows="6" animated />
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router'
import StorageEditor from './components/StorageEditor.vue'
import StorageConnectionPanel from './components/StorageConnectionPanel.vue'
import { useStorage } from './compositions/storages'
import { forgetStorageStatus } from './compositions/storage-status'
import { useSubmitting } from '../core/compositions/submitting'
import { updateStorage } from '@/modules/assets/store/storages'

const { params: routeParams } = useRoute()
const storageId = routeParams.storageId as string
const { data } = useStorage(storageId)

const { submitting, submit } = useSubmitting(
    function save(changes) {
      return updateStorage({
        ...changes,
        _id: storageId,
        kind: data.storage.kind
      }).then((newStorage) => {
        // saved settings may change the outcome of the last test
        forgetStorageStatus(storageId)
        Object.assign(data.storage, newStorage)
      })
    },
    {
      success: 'Storage updated successfully',
      error: 'Failed to update storage'
    }
)

function onSubmitted(payload: Record<string, any>) {
  return submit(payload)
}
</script>
<style scoped>
.loading {
  padding: 20px;
}
</style>
