<template>
  <div class="security-tab">
    <el-card class="security-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Security Settings') }}</h2>
          <p class="subtitle">{{ $t('Manage workspace security and access controls') }}</p>
        </div>
      </template>
      
      <el-empty 
        :description="$t('Security management features coming soon')"
        :image-size="200"
      >
        <template #description>
          <p>{{ $t('This section will include:') }}</p>
          <ul class="feature-list">
            <li>{{ $t('Two-factor authentication (2FA) settings') }}</li>
            <li>{{ $t('Session management and timeout controls') }}</li>
            <li>{{ $t('IP whitelist/blacklist') }}</li>
            <li>{{ $t('Audit logs and activity monitoring') }}</li>
            <li>{{ $t('Password policies') }}</li>
            <li>{{ $t('SSO configuration') }}</li>
            <li>{{ $t('API access tokens') }}</li>
          </ul>
        </template>
        <template #default>
          <el-button type="primary" disabled>
            <font-awesome-icon :icon="['fas', 'shield-alt']" class="icon-left" />
            {{ $t('Coming Soon') }}
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
// Placeholder component for security management
</script>

<style scoped>
.security-card {
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
