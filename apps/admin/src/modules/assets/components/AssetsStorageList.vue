<template>
  <div>
    <GpItem v-for="item in items" :key="item._id">
      <template v-slot:title>
        <router-link :to="{ name: 'editStorage', params: { storageId: item._id } }">
          {{ item.name }}
        </router-link>
      </template>
      <template v-slot:actions>
        <a @click.prevent="remove(item)">
          <el-icon><icon-delete/></el-icon> {{ $t('Remove') }}
        </a>
        <img :src="`logos/storage-${item.kind}.png`">
      </template>
    </GpItem>
  </div>
</template>
<script lang="ts" setup>
  import { useStorageList } from '../compositions/storages'
  import { useConfirmAction } from '../../core/compositions/confirm-action'
  import GpItem from '@/modules/core/components/layout/GpItem.vue';

  const list = useStorageList();

  const items = list.items;
  const remove = useConfirmAction(list.remove)
</script>
<style scoped>
img {
  max-width: 50px;
  position: absolute;
  right: 30px;
}
</style>
