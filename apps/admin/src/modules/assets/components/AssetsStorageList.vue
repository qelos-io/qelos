<template>
  <div>
    <!-- Storage Items List -->
    <div v-if="items.length > 0">
      <BlockItem v-for="item in items" :key="item._id">
        <template v-slot:title>
          <router-link :to="{ name: 'editStorage', params: { storageId: item._id } }">
            {{ item.name }}
          </router-link>
        </template>
        <template v-slot:actions>
          <a @click.prevent="remove(item)">
            <el-icon>
              <IconDelete/>
            </el-icon>
            {{ t('Remove') }}
          </a>
          <img :src="`logos/storage-${item.kind}.png`">
        </template>
      </BlockItem>
    </div>

    <!-- Empty State Placeholder -->
    <EmptyState v-else-if="list.loaded" 
                description="Get started by creating your first storage configuration to manage your files and assets."
                :image-size="150">
      <router-link :to="{ name: 'addStorage' }">
        <el-button type="primary" size="large">
          <el-icon class="mr-2">
            <IconPlus/>
          </el-icon>
          {{ t('Create Storage') }}
        </el-button>
      </router-link>
    </EmptyState>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useStorageList } from '../compositions/storages'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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

/* Loading State */
.loading-state {
  padding: 20px;
}

.mr-2 {
  margin-right: 8px;
}
</style>
