<script lang="ts" setup>
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
  <div class="settings-page">
    <header class="page-head">
      <div>
        <h1>{{ $t('Settings') }}</h1>
        <p>{{ $t('Everything that shapes your application: how it looks, who can sign in, and what it connects to.') }}</p>
      </div>
      <el-button type="primary" @click="router.push({ name: 'createConfiguration' })">
        <el-icon><Plus /></el-icon>
        <span class="action-label">{{ $t('Custom configuration') }}</span>
      </el-button>
    </header>

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
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 0;
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

@media (max-width: 639px) {
  .settings-page {
    padding: 12px;
  }

  .action-label {
    display: none;
  }
}
</style>
