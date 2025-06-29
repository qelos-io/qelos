<template>
  <div class="categories-page">
    <ListPageTitle 
      title="Configurations" 
      description="Configurations store key-value pairs and settings for your application. Manage environment variables, API keys, and other configuration data here."
      create-route="createConfiguration"
    >
      <template #content>
        <div class="search-bar">
          <el-select 
            v-model="filterType" 
            placeholder="Filter by type" 
            clearable
            class="filter-select"
            popper-class="filter-select-dropdown"
          >
            <template #prefix>
              <el-icon><Filter /></el-icon>
            </template>
            <el-option label="All configurations" value=""></el-option>
            <el-option label="Public configurations" value="public">
              <div class="option-with-icon">
                <el-icon><Lock /></el-icon>
                <span>{{ $t('Public') }}</span>
              </div>
            </el-option>
            <el-option label="Private configurations" value="private">
              <div class="option-with-icon">
                <el-icon><Lock /></el-icon>
                <span>{{ $t('Private') }}</span>
              </div>
            </el-option>
          </el-select>
        </div>
      </template>
    </ListPageTitle>
    <ConfigurationsList   
      :filter-type="filterType"
      :search-query="$route.query.q?.toString()"
    />
  </div>
</template>
<script lang="ts" setup>
import ConfigurationsList from './components/ConfigurationsList.vue'
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Filter, Lock } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

// Initialize with values from URL query parameters if available
const filterType = ref('');

// Sync with URL query parameters
onMounted(() => {
  // Get initial values from URL if available
  if (route.query.filter) {
    filterType.value = route.query.filter as string;
  }
});

// Update URL when filter or search changes
watch([filterType], ([newFilterType]) => {
  const query = { ...route.query };
  
  // Update filter in query
  if (newFilterType) {
    query.filter = newFilterType;
  } else {
    delete query.filter;
  }

  // Update URL without reloading the page
  router.replace({ query });
});
</script>
<style scoped>
.search-bar {
  display: flex;
  gap: var(--spacing);
  margin-bottom: var(--spacing);
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 100%;
}

.filter-select {
  margin-right: var(--spacing);
}

.option-with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-with-icon .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}
</style>