import {reactive} from 'vue'
import {useSubmitting} from '../../core/compositions/submitting'
import {useDispatcher} from '../../core/compositions/dispatcher'
import {removeUnsavedChanges} from '../../drafts/compositions/unsaved-changes'
import blocksService from '../../../services/apis/blocks-service'
import {useEditedInputModels} from '../../core/compositions/edited-inputs';
import {IBlock} from '@/services/types/block';

export function useReadableBlock(blockId: string) {
  const {result: block, loading} = useDispatcher<IBlock>(() => blocksService.getOne(blockId))

  return {
    block,
    loading
  }
}


export function useEditBlock(blockId: string) {
  const {block, loading} = useReadableBlock(blockId)

  const {submit, submitting} = useSubmitting(
    (payload) => blocksService.update(blockId, payload).then((newBlock) => {
      removeUnsavedChanges('block', blockId);
      block.value = newBlock;
    }),
    {
      success: 'Block updated successfully',
      error: 'Failed to update category'
    }
  )

  return {
    block,
    updateBlock: submit,
    submitting,
    loading
  }
}

export function useBlockForm(props) {
  const editedBlock = reactive<Partial<IBlock>>({
    name: null,
    description: null,
    content: null,
    contentType: null,
  })

  return {
    editedBlock,
    ...useEditedInputModels(editedBlock, props.block, ['name', 'description', 'content', 'contentType']),
  }
}
