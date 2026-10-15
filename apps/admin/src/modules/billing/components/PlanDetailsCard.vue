<script lang="ts" setup>
import { computed } from 'vue'
import { Check } from '@element-plus/icons-vue'
import type { IPlan } from '@qelos/global-types'
import { describePlanLimits } from '../services/billing-presentation'

const props = defineProps<{ plan: IPlan | null; loading?: boolean }>()

const limits = computed(() => describePlanLimits(props.plan?.limits))
</script>

<template>
  <section class="plan-details" :aria-label="$t('Plan details')" :aria-busy="loading">
    <h3>{{ $t('What is included') }}</h3>

    <el-skeleton v-if="loading" :rows="4" animated />

    <template v-else-if="plan">
      <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>

      <ul v-if="plan.features?.length" class="feature-list">
        <li v-for="feature in plan.features" :key="feature">
          <el-icon><Check /></el-icon>
          <span>{{ feature }}</span>
        </li>
      </ul>

      <div v-if="limits.length" class="limits">
        <h4>{{ $t('Limits') }}</h4>
        <dl>
          <div v-for="limit in limits" :key="limit.key">
            <dt>{{ limit.label }}</dt>
            <dd>{{ limit.value === true ? $t('Included') : limit.value }}</dd>
          </div>
        </dl>
      </div>

    </template>

    <p v-else class="plan-empty">{{ $t('Pick a plan to see what it includes.') }}</p>
  </section>
</template>

<style scoped lang="scss">
.plan-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);

  h3 {
    margin: 0;
    font-size: 16px;
  }

  h4 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
}

.plan-description,
.plan-empty {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.plan-empty {
  color: var(--el-text-color-secondary);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
  }

  .el-icon {
    margin-block-start: 3px;
    color: var(--el-color-primary);
  }
}

.limits {
  padding-block-start: 14px;
  border-block-start: 1px solid var(--el-border-color-extra-light);

  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin: 0;
  }

  dt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
</style>
