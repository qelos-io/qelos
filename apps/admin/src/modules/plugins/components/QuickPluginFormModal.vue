<script setup lang="ts">
import QuickReverseProxyForm from './quick-plugin/QuickReverseProxyForm.vue';
import QuickInjectableForm from './quick-plugin/QuickInjectableForm.vue';
import { ref, watch, computed } from 'vue';
import { useCreatePlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useRoute, useRouter } from 'vue-router';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IPlugin } from '@/services/types/plugin';
import { ElNotification } from 'element-plus';

const router = useRouter();
const route = useRoute();
const visible = defineModel<boolean>('visible')
const emit = defineEmits(['close', 'saved'])

const { savePlugin, submitting } = useCreatePlugin();

const form = ref<any>({});
const activeStep = computed(() => route.query.option);
const isLoading = ref(false);

function selectOption(option: string) {
  router.push({query: {...route.query, option}})
}

function goBack() {
  router.push({query: {...route.query, option: undefined}})
}

async function submit() {
  isLoading.value = true;
  try {
    // For remote plugin, fetch the manifest and create the plugin
    if (route.query.option === 'remote' && form.value.manifestUrl) {
      const plugin: Partial<IPlugin & { hardReset: boolean }> = { hardReset: true, manifestUrl: form.value.manifestUrl };
      try {
        const res = await fetch(form.value.manifestUrl, {
          mode: 'cors',
        })
        const str = await res.text();
        const data = JSON.parse(str);

        plugin.name = data.name;
        plugin.apiPath = data.apiPath;
        plugin.proxyUrl = data.proxyUrl?.startsWith('http') ? data.proxyUrl : data.proxyUrl ? new URL(data.proxyUrl, data.appUrl).href : '';
        plugin.callbackUrl = data.callbackUrl?.startsWith('http') ? data.callbackUrl : data.callbackUrl ? new URL(data.callbackUrl, data.appUrl).href : '';
        plugin.registerUrl = data.registerUrl?.startsWith('http') ? data.registerUrl : data.registerUrl ? new URL(data.registerUrl, data.appUrl).href : '';
        
        await savePlugin(plugin);
        ElNotification({
          title: 'Success',
          message: 'Remote plugin successfully created',
          type: 'success',
        });
        emit('saved', plugin);
        emit('close');
        return;
      } catch (error) {
        console.error('Error loading plugin manifest:', error);
        ElNotification({
          title: 'Error',
          message: 'Failed to load plugin manifest',
          type: 'error',
        });
        return;
      }
    }
    
    // For other plugin types
    await savePlugin(form.value);
    ElNotification({
      title: 'Success',
      message: 'Plugin successfully created',
      type: 'success',
    });
    emit('saved', form.value);
    emit('close');
  } catch (error) {
    ElNotification({
      title: 'Error',
      message: 'Failed to create plugin',
      type: 'error',
    });
  } finally {
    isLoading.value = false;
  }
}

watch(visible, () => {
  if (visible.value) {
    form.value = {};
    router.push({query: {...route.query, option: undefined}})
  }
})
</script>

<template>
<el-form v-if="visible" @submit.prevent="submit">
  <el-dialog 
    v-model="visible"
    :title="$t('Create a Plugin')"
    @close="$emit('close')"
    width="650px"
    class="plugin-creation-dialog"
    :close-on-click-modal="false">
    
    <el-card v-if="!activeStep" class="plugin-selection-card">
      <template #header>
        <div class="card-header">
          <h3>{{ $t('Choose a Plugin Type') }}</h3>
          <p class="subtitle">{{ $t('Select the type of plugin you want to create') }}</p>
        </div>
      </template>
      
      <div class="plugin-options">
        <div class="plugin-option" @click="selectOption('reverse-proxy')">
          <div class="option-icon">
            <font-awesome-icon :icon="['fas', 'network-wired']" />
          </div>
          <div class="option-content">
            <h4>{{ $t('Reverse Proxy') }}</h4>
            <p>{{ $t('Connect to external APIs and services') }}</p>
          </div>
        </div>
        
        <div class="plugin-option" @click="selectOption('analytics')">
          <div class="option-icon">
            <font-awesome-icon :icon="['fas', 'chart-simple']" />
          </div>
          <div class="option-content">
            <h4>{{ $t('Analytics Script') }}</h4>
            <p>{{ $t('Add tracking and analytics to your application') }}</p>
          </div>
        </div>
        
        <div class="plugin-option" @click="selectOption('subscribe')">
          <div class="option-icon">
            <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
          </div>
          <div class="option-content">
            <h4>{{ $t('Event Subscription') }}</h4>
            <p>{{ $t('Listen and respond to system events') }}</p>
          </div>
        </div>
        
        <div class="plugin-option" @click="selectOption('remote')">
          <div class="option-icon">
            <font-awesome-icon :icon="['fas', 'link']" />
          </div>
          <div class="option-content">
            <h4>{{ $t('Remote Plugin') }}</h4>
            <p>{{ $t('Connect to an existing remote plugin via manifest') }}</p>
          </div>
        </div>
        
        <router-link is="div" class="plugin-option manual-option" :to="{name: 'createPlugin'}">
          <div class="option-icon">
            <font-awesome-icon :icon="['fas', 'chalkboard-user']" />
          </div>
          <div class="option-content">
            <h4>{{ $t('Manual Configuration') }}</h4>
            <p>{{ $t('Advanced setup with full configuration options') }}</p>
          </div>
        </router-link>
      </div>
    </el-card>

    <el-card v-else class="plugin-form-card">
      <template #header>
        <div class="card-header with-back">
          <div class="header-navigation">
            <el-button class="back-button" type="text" @click="goBack">
              <font-awesome-icon :icon="['fas', 'arrow-left']" />
              {{ $t('Back to options') }}
            </el-button>
          </div>
          <h3 class="step-title">
            {{ $t({
              'reverse-proxy': 'Configure Reverse Proxy Plugin',
              'analytics': 'Configure Analytics Plugin',
              'subscribe': 'Configure Event Subscription',
              'remote': 'Link Remote Plugin'
            }[activeStep] || 'Configure Plugin') }}
          </h3>
        </div>
      </template>
      
      <div class="form-container">
        <div v-if="activeStep === 'reverse-proxy'">
          <QuickReverseProxyForm @changed="form = $event"/>
        </div>
        
        <div v-else-if="activeStep === 'analytics'">
          <QuickInjectableForm @changed="form = $event"/>
        </div>
        
        <div v-else-if="activeStep === 'remote'">
          <div class="remote-plugin-form">
            <el-alert
              type="info"
              :closable="false"
              show-icon>
              <p>{{ $t('Enter the URL of the plugin manifest to connect to a remote plugin') }}</p>
            </el-alert>
            
            <FormRowGroup class="manifest-input">
              <FormInput 
                title="Manifest URL" 
                label="required" 
                v-model="form.manifestUrl" 
                placeholder="https://example.com/manifest.json"
                :disabled="isLoading"/>
            </FormRowGroup>
          </div>
        </div>
      </div>
    </el-card>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('close')" :disabled="isLoading || submitting">
          {{ $t(activeStep ? 'Cancel' : 'Close') }}
        </el-button>
        <el-button 
          v-if="activeStep" 
          type="primary" 
          native-type="submit" 
          :disabled="isLoading || submitting" 
          :loading="isLoading || submitting">
          {{ $t('Create Plugin') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</el-form>
</template>

<style scoped>
.plugin-creation-dialog :deep(.el-dialog__header) {
  padding: 20px;
  margin-right: 0;
  border-bottom: 1px solid var(--border-color-light, #ebeef5);
}

.plugin-creation-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.plugin-creation-dialog :deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color-light, #ebeef5);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.card-header .subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #606266);
}

.card-header.with-back {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-navigation {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.back-button {
  padding: 0;
  font-size: 14px;
  height: auto;
  line-height: 1;
}

.step-title {
  margin: 4px 0 0 0;
  text-align: center;
}

.plugin-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 8px;
}

.plugin-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #dcdfe6);
  transition: all 0.3s;
  cursor: pointer;
  background-color: var(--bg-color, #ffffff);
}

.plugin-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-color, #409eff);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--primary-color-light, #ecf5ff);
  color: var(--primary-color, #409eff);
  margin-right: 16px;
  font-size: 20px;
}

.option-content {
  flex: 1;
}

.option-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #303133);
}

.option-content p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #606266);
  line-height: 1.4;
}

.manual-option {
  grid-column: span 2;
}

.manual-option .option-icon {
  background-color: var(--info-color-light, #f4f4f5);
  color: var(--info-color, #909399);
}

.form-container {
  padding: 16px;
}

.remote-plugin-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.manifest-input {
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .plugin-options {
    grid-template-columns: 1fr;
  }
  
  .manual-option {
    grid-column: span 1;
  }
}
</style>