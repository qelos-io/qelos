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
        <FormInput
          title="Manifest URL"
          label="required"
          required
          prop="manifestUrl"
          :error="manifestError"
          v-model="plugin.manifestUrl"
        />
        <FormInput title="Plugin API Path" label="Leave empty to auto-set" v-model="plugin.apiPath"/>
      </FormRowGroup>
      <div class="refresh-button-container">
        <el-button type="primary" class="refresh-button" @click="refreshPluginFromManifest">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'sync']" />
          </el-icon>
          <span>{{ $t('Refresh from Manifest') }}</span>
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
  manifestError?: string;
}>();

const emit = defineEmits<{
  (e: 'refreshManifest'): void;
}>();

function refreshPluginFromManifest() {
  emit('refreshManifest');
}
</script>
