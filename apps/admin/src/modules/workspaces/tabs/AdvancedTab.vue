<template>
  <div class="advanced-tab">
    <el-card class="advanced-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Advanced Settings') }}</h2>
          <p class="subtitle">{{ $t('Advanced workspace configuration and tools') }}</p>
        </div>
      </template>
      
      <el-empty 
        :description="$t('Advanced settings features coming soon')"
        :image-size="200"
      >
        <template #description>
          <p>{{ $t('This section will include:') }}</p>
          <ul class="feature-list">
            <li>{{ $t('Data export and backup') }}</li>
            <li>{{ $t('Workspace analytics and metrics') }}</li>
            <li>{{ $t('Custom domain configuration') }}</li>
            <li>{{ $t('Email settings and templates') }}</li>
            <li>{{ $t('Workspace deletion and archiving') }}</li>
            <li>{{ $t('API rate limiting') }}</li>
            <li>{{ $t('Storage management') }}</li>
            <li>{{ $t('Feature flags and toggles') }}</li>
          </ul>
        </template>
        <template #default>
          <el-button type="primary" disabled>
            <font-awesome-icon :icon="['fas', 'cogs']" class="icon-left" />
            {{ $t('Coming Soon') }}
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
// Placeholder component for advanced settings
</script>

<style scoped>
.advanced-card {
  border-radius: 8px;
}

.card-header {
  margin-bottom: 10px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.feature-list {
  text-align: left;
  margin: 20px 0;
  padding-left: 20px;
}

.feature-list li {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.icon-left {
  margin-right: 5px;
}
</style>
