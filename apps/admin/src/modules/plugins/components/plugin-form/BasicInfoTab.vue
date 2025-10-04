<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
          <span>{{ $t('Plugin Details') }}</span>
        </div>
      </template>
      <FormRowGroup>
        <FormInput title="Name" v-model="plugin.name" required/>
        <FormInput title="Description" v-model="plugin.description"/>
      </FormRowGroup>
    </el-card>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'cloud-download']" /></el-icon>
          <span>{{ $t('Quick Remote Load') }}</span>
        </div>
      </template>
      <FormRowGroup>
        <FormInput title="Manifest URL" label="required" v-model="plugin.manifestUrl"/>
        <FormInput title="Plugin API Path" label="Leave empty to auto-set" v-model="plugin.apiPath"/>
      </FormRowGroup>
      <div class="refresh-button-container">
        <!-- Single button handling all states -->
        <el-button type="primary" class="refresh-button" :loading="props.isRefreshing" :disabled="props.isRefreshing" @click="props.lastError ? retryRefresh() : refreshPluginFromManifest()">
          <!-- Only show sync icon if not in loading state -->
          <el-icon v-if="!props.isRefreshing">
            <font-awesome-icon :icon="['fas', 'sync']" />
          </el-icon>
          <span><!-- Span by state -->
            <template v-if="props.isRefreshing">Loading…</template>
            <template v-else-if="props.lastError">Retry</template>
            <template v-else>Refresh from Manifest</template>
          </span>
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IPlugin } from '@/services/types/plugin';

//added props to receive UX state
const props = defineProps<{
  plugin: Partial<IPlugin>,
  isRefreshing?: boolean,
  lastError?: string | null
}>();

const emit = defineEmits<{
  (e: 'refresh-manifest'): void
  (e: 'retry'): void
}>();

function refreshPluginFromManifest() {
  emit('refresh-manifest');
}

function retryRefresh(){
  emit('retry');
}
</script>
