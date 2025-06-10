<template>
  <div>
    <GpItem v-for="draft in drafts" :key="draft._id">
      <template v-slot:title>
        <router-link :to="getDraftLink(draft)">
          {{ $t(draft.contextType) }} - {{ draft.contextDisplayName || '[no display name]' }}
        </router-link>
      </template>
      <template v-slot:actions>
        <a @click.prevent="remove(draft)">
          <el-icon>
            <icon-delete/>
          </el-icon>
          {{ $t('Remove') }}
        </a>
      </template>
    </GpItem>
  </div>
</template>
<script lang="ts" setup>
import {ref} from 'vue'
import {useConfirmAction} from '../../core/compositions/confirm-action'
import {getAll, deleteDraft} from '../../../services/drafts-service'
import {useNotifications} from '../../core/compositions/notifications'
import {useSubmitting} from '../../core/compositions/submitting'
import GpItem from '@/modules/core/components/layout/BlockItem.vue';

const drafts = ref([])
const {error} = useNotifications()
getAll()
  .then(list => {
    drafts.value = list
  })
  .catch(() => error('Failed to load drafts list'))

const getDraftLink = (draft) => {
  let routeName
  switch (draft.contextType) {
    case 'block':
      routeName = draft.contextId ? 'editBlock' : 'createBlock'
      break;
    default:
      routeName = 'drafts'
  }

  return {
    name: routeName,
    params: draft.contextRouteParams
  }
};
const remove = useConfirmAction(
  useSubmitting(
    async draft => {
      await deleteDraft(draft.contextType, draft.contextId)
      drafts.value = drafts.value.filter(d => d !== draft)
    },
    {success: 'Draft deleted successfully', error: 'Failed to remove draft'}
  ).submit)
</script>
