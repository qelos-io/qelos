import { computed, reactive, ref } from 'vue'
import storagesService from '../../../services/storages-service'
import { fetchStorages, removeStorage, storagesStore } from '../store/storages'
import { useSubmitting } from '../../core/compositions/submitting'
import { IStorage } from '../../../services/types/storage'

export function useStorageList() {
  const promise = fetchStorages()

  const { submit: remove } = useSubmitting(
    ({ _id }) => removeStorage(_id),
    {
      success: 'Storage removed successfully',
      error: 'Failed to remove storage'
    }
  )

  return {
    items: computed(() => storagesStore.storages),
    loaded: computed(() => storagesStore.loaded),
    remove,
    promise
  }
}

export function useStorageForm(props) {
  const editedStorage = reactive({
    ...(props.value || {
      name: 'New Storage',
      kind: 'ftp',
      isDefault: false
    }),
    authentication: null,
    metadata: {
      publicUrl: '',
      basePath: '/',
      bucketName: '',
      ...(props.value ? props.value.metadata : {})
    }
  })
  const showAuth = ref(!props.value)

  return {
    editedStorage,
    showAuth
  }
}

export function useStorage(storageId: string) {
  const data = reactive<{ loading: boolean, storage: IStorage & any }>({
    loading: true,
    storage: {}
  })

  storagesService.getOne(storageId).then((storage) => {
    data.storage = storage
    data.loading = false
  })
  return { data }
}
