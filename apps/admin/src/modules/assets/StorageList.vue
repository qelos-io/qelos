<template>
  <AppPage :title="$t('Storage')">
    <template #subtitle>
      <span v-if="items.length" class="page-summary" aria-live="polite">
        {{ items.length }} {{ items.length === 1 ? $t('storage') : $t('storages') }}
        <template v-if="counts.ok"> · <span class="ok">{{ counts.ok }} {{ $t('connected') }}</span></template>
        <template v-if="counts.error"> · <span class="bad">{{ counts.error }} {{ $t('failing') }}</span></template>
        <template v-if="counts.idle"> · {{ counts.idle }} {{ $t('not tested') }}</template>
      </span>
      <template v-else>{{ $t('Where your app keeps uploaded files') }}</template>
    </template>
    <template v-if="items.length" #actions>
      <el-button :loading="testingAll" @click="testAll">{{ $t('Test all') }}</el-button>
      <el-button type="primary" @click="router.push({ name: 'addStorage' })">
        <el-icon><Plus /></el-icon>
        <span class="action-label">{{ $t('Add storage') }}</span>
      </el-button>
    </template>

    <div v-if="items.length" class="storage-grid">
      <StorageCard
        v-for="item in items"
        :key="item._id"
        :storage="item"
        :status="getStorageStatus(item._id)"
        @test="testStorage"
        @remove="remove"
      />
    </div>

    <section v-else-if="loaded" class="storage-empty" :aria-label="$t('Connect storage')">
      <h2>{{ $t('Connect your first storage') }}</h2>
      <p>{{ $t('Pick the provider that holds your files. You can test the connection right after saving.') }}</p>
      <ul class="provider-tiles">
        <li v-for="provider in STORAGE_PROVIDERS" :key="provider.value">
          <router-link class="provider-tile" :to="{ name: 'addStorage', query: { kind: provider.value } }">
            <img :src="provider.logo" alt="" aria-hidden="true" />
            <span class="tile-name">{{ provider.label }}</span>
            <span class="tile-hint">{{ $t(provider.hint) }}</span>
          </router-link>
        </li>
      </ul>
    </section>

    <el-skeleton v-else :rows="4" animated />
  </AppPage>
</template>

<script lang="ts" setup>
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import StorageCard from './components/StorageCard.vue';
import { useStorageList } from './compositions/storages';
import { getStorageStatus, testStorage, testStorages, forgetStorageStatus } from './compositions/storage-status';
import { useConfirmAction } from '../core/compositions/confirm-action';
import { STORAGE_PROVIDERS } from './services/storage-providers';

const router = useRouter();
const list = useStorageList();
const items = list.items;
const loaded = list.loaded;

const confirmRemove = useConfirmAction(list.remove);
async function remove(storage) {
  await confirmRemove(storage);
  if (!items.value.some((item) => item._id === storage._id)) {
    forgetStorageStatus(storage._id);
  }
}

const counts = computed(() => {
  const result = { ok: 0, error: 0, idle: 0 };
  for (const item of items.value) {
    const state = getStorageStatus(item._id).state;
    if (state === 'ok') result.ok++;
    else if (state === 'error') result.error++;
    else result.idle++;
  }
  return result;
});

const testingAll = ref(false);
async function testAll() {
  testingAll.value = true;
  try {
    await testStorages(items.value.map((item) => item._id));
  } finally {
    testingAll.value = false;
  }
}
</script>

<style scoped lang="scss">

.page-summary {
  .ok {
    color: var(--el-color-success);
    font-weight: 600;
  }

  .bad {
    color: var(--el-color-danger);
    font-weight: 600;
  }
}

.storage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.storage-empty {
  max-inline-size: 760px;
  margin-inline: auto;
  padding-block: 32px;
  text-align: center;

  h2 {
    margin: 0 0 8px;
    font-size: 20px;
  }

  p {
    margin: 0 0 24px;
    color: var(--el-text-color-regular);
  }
}

.provider-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.provider-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  block-size: 100%;
  padding: 20px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-bg-color);
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  img {
    inline-size: 48px;
    block-size: 48px;
    object-fit: contain;
  }
}

.tile-name {
  font-weight: 600;
}

.tile-hint {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .storage-page {
    padding: 12px;
  }

  .page-head {
    flex-direction: column;
  }

  .storage-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .provider-tile {
    transition: none;
  }
}
</style>
