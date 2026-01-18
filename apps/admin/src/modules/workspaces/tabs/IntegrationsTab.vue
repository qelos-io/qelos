<template>
  <div class="integrations-tab">
    <el-card class="integrations-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Integrations') }}</h2>
          <p class="subtitle">{{ $t('Connect your workspace with external services') }}</p>
        </div>
      </template>
      
      <el-empty 
        :description="$t('Integration management features coming soon')"
        :image-size="200"
      >
        <template #description>
          <p>{{ $t('This section will include:') }}</p>
          <ul class="feature-list">
            <li>{{ $t('Slack integration') }}</li>
            <li>{{ $t('GitHub repositories') }}</li>
            <li>{{ $t('Google Workspace') }}</li>
            <li>{{ $t('Microsoft 365') }}</li>
            <li>{{ $t('Zapier automation') }}</li>
            <li>{{ $t('Webhook configurations') }}</li>
            <li>{{ $t('API keys management') }}</li>
          </ul>
        </template>
        <template #default>
          <el-button type="primary" disabled>
            <font-awesome-icon :icon="['fas', 'plug']" class="icon-left" />
            {{ $t('Coming Soon') }}
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
// Placeholder component for integrations management
</script>

<style scoped>
.integrations-card {
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
