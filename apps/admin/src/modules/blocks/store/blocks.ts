import { defineStore } from 'pinia';
import blocksService from '@/services/blocks-service';
import { computed, reactive } from 'vue';

export const useBlocks = defineStore('blocks', function useBlocks() {
  const initializedBlocks = {};
  const localCache = reactive<Record<string, string>>({})


  return {
    async init(blockId: string) {
      if (!(localCache[blockId] || initializedBlocks[blockId])) {
        initializedBlocks[blockId] = true;
        localCache[blockId] = await blocksService.getOne(blockId).then((block) => block.content)
      }
    },
    getBlock(blockId: string) {
      return computed(() => localCache[blockId])
    },
  }
})
