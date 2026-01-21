<template>
  <div class="payments-tab">
    <el-card class="payments-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Payment Settings') }}</h2>
          <p class="subtitle">{{ $t('Manage your subscription and payment methods') }}</p>
        </div>
      </template>
      
      <el-empty 
        :description="$t('Payment management features coming soon')"
        :image-size="200"
      >
        <template #description>
          <p>{{ $t('This section will include:') }}</p>
          <ul class="feature-list">
            <li>{{ $t('Credit card management') }}</li>
            <li>{{ $t('Plan selection and upgrades') }}</li>
            <li>{{ $t('Invoice history and downloads') }}</li>
            <li>{{ $t('Billing notifications') }}</li>
            <li>{{ $t('Usage analytics') }}</li>
          </ul>
        </template>
        <template #default>
          <el-button type="primary" disabled>
            <font-awesome-icon :icon="['fas', 'credit-card']" class="icon-left" />
            {{ $t('Coming Soon') }}
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
// Payment management component for B2C users
</script>

<style scoped>
.payments-card {
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
