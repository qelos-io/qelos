<script lang="ts" setup>
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import ConfigurationsList from './components/ConfigurationsList.vue';

const route = useRoute();
const router = useRouter();

// the visibility filter lives in the URL so a filtered view can be shared
const visibility = computed({
  get: () => ((route.query.filter as string) || '') as '' | 'public' | 'private',
  set: (value) => {
    const query = { ...route.query };
    if (value) query.filter = value;
    else delete query.filter;
    router.replace({ query });
  },
});
</script>

<template>
  <AppPage :title="$t('Settings')" :subtitle="$t('Everything that shapes your application: how it looks, who can sign in, and what it connects to.')">
    <template #actions>
      <el-button type="primary" @click="router.push({ name: 'createConfiguration' })">
        <el-icon><Plus /></el-icon>
        <span class="action-label">{{ $t('Custom configuration') }}</span>
      </el-button>
    </template>

    <div class="toolbar">
      <el-segmented
        v-model="visibility"
        :options="[
          { label: $t('All'), value: '' },
          { label: $t('Public'), value: 'public' },
          { label: $t('Private'), value: 'private' },
        ]"
        :aria-label="$t('Filter by type')"
      />
    </div>

    <ConfigurationsList :visibility="visibility" :search-query="($route.query.q as string) || ''" />
  </AppPage>
</template>
