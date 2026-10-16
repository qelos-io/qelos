<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import NewPluginDialog from './components/new-plugin/NewPluginDialog.vue';
import YourPluginsList from './components/YourPluginsList.vue';
import { usePluginsList } from './store/plugins-list';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePluginsList();

const subtitle = computed(() => {
  if (!store.loaded) return undefined;
  const count = store.plugins.length;
  return count === 1 ? t('1 plugin') : t('{count} plugins', { count });
});

const openCreate = () => router.push({ query: { ...route.query, mode: 'quick-create' } });

function closeDialog() {
  if (route.query.mode === 'quick-create') router.push({ query: { ...route.query, mode: undefined, option: undefined } });
}
</script>

<template>
  <AppPage :title="$t('Plugins')" :subtitle="subtitle">
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openCreate">{{ $t('New plugin') }}</el-button>
    </template>
    <YourPluginsList />
    <NewPluginDialog :visible="route.query.mode === 'quick-create'" @close="closeDialog" />
  </AppPage>
</template>
