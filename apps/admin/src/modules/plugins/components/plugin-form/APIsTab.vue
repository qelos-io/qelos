<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
          <span>{{ $t('API Configuration') }}</span>
        </div>
      </template>
      <p class="card-description">{{ $t('Configure how the plugin integrates with the Qelos API system.') }}</p>
      
      <!-- Visual API Path Representation -->
      <div v-if="plugin.apiPath || plugin.manifestUrl" class="api-path-visualization">
        <div class="visualization-header">
          <el-icon><font-awesome-icon :icon="['fas', 'diagram-project']" /></el-icon>
          <span>{{ $t('API Integration') }}</span>
        </div>
        <div class="api-flow-diagram">
          <div class="flow-node client">
            <el-icon><font-awesome-icon :icon="['fas', 'laptop']" /></el-icon>
            <span>{{ $t('Client') }}</span>
          </div>
          <div class="flow-arrow">
            <el-icon><font-awesome-icon :icon="['fas', 'arrow-right']" /></el-icon>
          </div>
          <div class="flow-node qelos">
            <el-icon><font-awesome-icon :icon="['fas', 'server']" /></el-icon>
            <span>{{ $t('Qelos') }}</span>
            <div class="endpoint">{{ baseUrl }}{{ plugin.apiPath || '...' }}</div>
          </div>
          <div class="flow-arrow">
            <el-icon><font-awesome-icon :icon="['fas', 'arrow-right']" /></el-icon>
          </div>
          <div class="flow-node plugin">
            <el-icon><font-awesome-icon :icon="['fas', 'puzzle-piece']" /></el-icon>
            <span>{{ $t('Plugin API') }}</span>
            <div class="endpoint">{{ formattedProxyUrl || '...' }}</div>
          </div>
        </div>
      </div>
      
      <!-- API Path Configuration -->
      <div class="config-section">
        <h4 class="section-title">
          <el-icon><font-awesome-icon :icon="['fas', 'link']" /></el-icon>
          {{ $t('API Endpoint') }}
          <el-tag size="small" effect="plain" type="success" v-if="plugin.apiPath">{{ $t('Configured') }}</el-tag>
          <el-tag size="small" effect="plain" type="warning" v-else>{{ $t('Not Configured') }}</el-tag>
        </h4>
        <el-form :model="plugin" class="api-form">
          <el-form-item 
            prop="apiPath" 
            :rules="[{ required: !plugin.manifestUrl, message: 'API Path is required', trigger: 'blur' }]"
          >
            <template #label>
              <div class="form-label">
                <span>{{ $t('API Path') }}</span>
                <el-tooltip 
                  effect="dark" 
                  :content="$t('The path where this plugin\'s API will be accessible (e.g., /api/my-plugin)')" 
                  placement="top"
                >
                  <el-icon class="info-icon"><font-awesome-icon :icon="['fas', 'circle-info']" /></el-icon>
                </el-tooltip>
                <el-tag v-if="plugin.manifestUrl" size="small" type="info" class="auto-tag">{{ $t('Auto') }}</el-tag>
              </div>
            </template>
            <el-input 
              v-model="plugin.apiPath" 
              :placeholder="plugin.manifestUrl ? 'Will be auto-set from manifest' : '/api/your-plugin-path'" 
              clearable
              :disabled="!!plugin.manifestUrl"
              :status="!plugin.apiPath && !plugin.manifestUrl ? 'error' : ''"
            >
              <template #prefix>
                <span class="input-prefix">{{ baseUrl }}</span>
              </template>
              <template #append v-if="!plugin.manifestUrl">
                <el-button @click="suggestApiPath" :disabled="!!plugin.apiPath">
                  <el-icon><font-awesome-icon :icon="['fas', 'magic']" /></el-icon>
                  {{ $t('Suggest') }}
                </el-button>
              </template>
            </el-input>
            <div class="form-helper-text" v-if="!plugin.manifestUrl && !plugin.apiPath">
              {{ $t('Recommended format: /api/[plugin-name]') }}
            </div>
          </el-form-item>
          
          <!-- Proxy URL Configuration -->
          <el-form-item prop="proxyUrl">
            <template #label>
              <div class="form-label">
                <span>{{ $t('Proxy URL') }}</span>
                <el-tooltip 
                  effect="dark" 
                  :content="$t('The URL where API requests will be forwarded to')" 
                  placement="top"
                >
                  <el-icon class="info-icon"><font-awesome-icon :icon="['fas', 'circle-info']" /></el-icon>
                </el-tooltip>
                <el-tag v-if="plugin.manifestUrl && !plugin.proxyUrl" size="small" type="info" class="auto-tag">{{ $t('From Manifest') }}</el-tag>
              </div>
            </template>
            <el-input 
              v-model="proxyUrlWithoutProtocol" 
              placeholder="api.your-plugin-domain.com" 
              clearable
              :status="!plugin.proxyUrl && !plugin.manifestUrl ? 'warning' : ''"
            >
              <template #prepend>
                <el-select v-model="proxyProtocol" style="width: 90px">
                  <el-option label="http://" value="http://" />
                  <el-option label="https://" value="https://" />
                </el-select>
              </template>
              <template #append>
                <el-button @click="testConnection" :disabled="!plugin.proxyUrl">
                  <el-icon><font-awesome-icon :icon="['fas', 'vial']" /></el-icon>
                </el-button>
              </template>
            </el-input>
            <div class="form-helper-text" v-if="plugin.manifestUrl">
              {{ $t('Leave empty to use manifest URL') }}
            </div>
            <div class="form-helper-text" v-else-if="!plugin.proxyUrl">
              {{ $t('Specify the URL where your plugin API is hosted') }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- Authentication Configuration -->
      <div class="config-section">
        <h4 class="section-title">
          <el-icon><font-awesome-icon :icon="['fas', 'key']" /></el-icon>
          {{ $t('Authentication') }}
          <el-tag size="small" effect="plain" type="success" v-if="plugin.token">{{ $t('Configured') }}</el-tag>
          <el-tag size="small" effect="plain" type="info" v-else-if="plugin._id">{{ $t('Using Existing') }}</el-tag>
          <el-tag size="small" effect="plain" type="warning" v-else>{{ $t('Not Configured') }}</el-tag>
        </h4>
        
        <div class="auth-info" v-if="plugin.token || plugin._id">
          <el-alert 
            type="info" 
            :closable="false" 
            show-icon
          >
            <template #title>
              <span>{{ $t('Authentication Method') }}: <strong>Bearer Token</strong></span>
            </template>
            <p>{{ $t('Qelos will automatically add the Bearer token to all API requests to your plugin.') }}</p>
          </el-alert>
        </div>
        
        <el-form :model="plugin" class="api-form">
          <el-form-item prop="token">
            <template #label>
              <div class="form-label">
                <span>{{ $t('API Token') }}</span>
                <el-tooltip 
                  effect="dark" 
                  :content="$t('Qelos will use this token as Bearer token for authentication')" 
                  placement="top"
                >
                  <el-icon class="info-icon"><font-awesome-icon :icon="['fas', 'circle-info']" /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <el-input 
              v-model="plugin.token" 
              placeholder="Enter API token" 
              clearable 
              show-password
              type="password"
            >
              <template #prepend>
                <span>Bearer</span>
              </template>
              <template #append>
                <el-button @click="generateToken" :disabled="!!plugin.token">
                  <el-icon><font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" /></el-icon>
                </el-button>
              </template>
            </el-input>
            <div class="form-helper-text" v-if="plugin._id && !plugin.token">
              {{ $t('Leave empty to keep existing token') }}
            </div>
            <div class="form-helper-text" v-else-if="!plugin.token">
              {{ $t('You can generate a secure token or provide your own') }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- Connection Status -->
      <div class="connection-status-container" v-if="connectionStatus">
        <div :class="['connection-status', connectionStatus.type]">
          <el-icon v-if="connectionStatus.type === 'success'"><font-awesome-icon :icon="['fas', 'check-circle']" /></el-icon>
          <el-icon v-else-if="connectionStatus.type === 'error'"><font-awesome-icon :icon="['fas', 'exclamation-circle']" /></el-icon>
          <span>{{ connectionStatus.message }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElNotification } from 'element-plus';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

// Base URL for API path display
const baseUrl = computed(() => {
  return window.location.origin + '/api/on/';
});

// Formatted proxy URL for display
const formattedProxyUrl = computed(() => {
  if (!props.plugin.proxyUrl) {
    return props.plugin.manifestUrl ? 'Using manifest URL' : null;
  }
  
  // Ensure URL has protocol
  if (props.plugin.proxyUrl.startsWith('http://') || props.plugin.proxyUrl.startsWith('https://')) {
    return props.plugin.proxyUrl;
  } else {
    return `${proxyProtocol.value}${props.plugin.proxyUrl}`;
  }
});

// Extract protocol from proxy URL or default to https
const proxyProtocol = ref('https://');

// Computed property to get URL without protocol for display in input
const proxyUrlWithoutProtocol = computed({
  get() {
    if (!props.plugin.proxyUrl) return '';
    
    // If URL already has protocol, extract it and return URL without protocol
    if (props.plugin.proxyUrl.startsWith('http://')) {
      proxyProtocol.value = 'http://';
      return props.plugin.proxyUrl.replace('http://', '');
    } else if (props.plugin.proxyUrl.startsWith('https://')) {
      proxyProtocol.value = 'https://';
      return props.plugin.proxyUrl.replace('https://', '');
    }
    
    // URL doesn't have protocol, return as is
    return props.plugin.proxyUrl;
  },
  set(value: string) {
    // When setting, combine with protocol and update the original property
    if (value) {
      props.plugin.proxyUrl = `${proxyProtocol.value}${value}`;
    } else {
      props.plugin.proxyUrl = '';
    }
  }
});

// Watch for protocol changes to update the full URL
watch(proxyProtocol, (newProtocol) => {
  if (proxyUrlWithoutProtocol.value) {
    props.plugin.proxyUrl = `${newProtocol}${proxyUrlWithoutProtocol.value}`;
  }
});

// Connection testing
const testingConnection = ref(false);
const connectionStatus = ref(null);

// Function to generate a secure token
const generateToken = () => {
  // Generate a random token (32 characters)
  const randomBytes = new Uint8Array(24); // 24 bytes will give us 32 base64 characters
  window.crypto.getRandomValues(randomBytes);
  const token = btoa(String.fromCharCode.apply(null, randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  props.plugin.token = token;
  
  ElNotification({
    title: 'Success',
    message: 'Secure API token generated',
    type: 'success',
  });
};

// Function to suggest an API path based on the plugin name
const suggestApiPath = () => {
  if (props.plugin.name) {
    // Convert plugin name to kebab case for the API path
    const kebabName = props.plugin.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    props.plugin.apiPath = `api/${kebabName}`;
    
    ElNotification({
      title: 'Success',
      message: 'API path suggested based on plugin name',
      type: 'success',
    });
  } else {
    ElNotification({
      title: 'Info',
      message: 'Please set a plugin name first to generate a suggestion',
      type: 'info',
    });
  }
};

// Function to test the API connection
const testConnection = async () => {
  if (!props.plugin.proxyUrl) {
    ElNotification({
      title: 'Error',
      message: 'Proxy URL is required to test connection',
      type: 'error',
    });
    return;
  }
  
  testingConnection.value = true;
  connectionStatus.value = null;
  
  try {
    // Format the URL correctly
    const url = props.plugin.proxyUrl.startsWith('http') 
      ? props.plugin.proxyUrl 
      : `${proxyProtocol.value}${props.plugin.proxyUrl}`;
    
    // Show testing notification
    ElNotification({
      title: 'Testing',
      message: `Testing connection to ${url}...`,
      type: 'info',
      duration: 2000
    });
      
    // Attempt to fetch from the API
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      headers: props.plugin.token ? {
        'Authorization': `Bearer ${props.plugin.token}`
      } : {},
    });
    
    if (response.ok) {
      connectionStatus.value = {
        type: 'success',
        message: 'Connection successful! API endpoint is reachable.'
      };
      
      ElNotification({
        title: 'Success',
        message: 'Connection successful! API endpoint is reachable.',
        type: 'success',
      });
    } else {
      connectionStatus.value = {
        type: 'error',
        message: `Connection failed with status: ${response.status} ${response.statusText}`
      };
      
      ElNotification({
        title: 'Error',
        message: `Connection failed with status: ${response.status} ${response.statusText}`,
        type: 'error',
      });
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      message: `Connection failed: ${error.message}`
    };
    
    ElNotification({
      title: 'Error',
      message: `Connection failed: ${error.message}`,
      type: 'error',
    });
  } finally {
    testingConnection.value = false;
  }
};
</script>

<style scoped>
.config-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.config-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--el-text-color-primary);
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-icon {
  color: var(--el-color-info);
  font-size: 0.9rem;
  cursor: help;
}

.auto-tag {
  font-size: 0.7rem;
  padding: 0 0.3rem;
  height: 18px;
  line-height: 16px;
}

.form-helper-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.3rem;
  padding-left: 0.2rem;
}

.input-prefix {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.connection-status-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.connection-status.success {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
  border-left: 4px solid var(--el-color-success);
}

.connection-status.error {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border-left: 4px solid var(--el-color-danger);
}

/* API Flow Diagram */
.api-path-visualization {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.visualization-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.api-flow-diagram {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.flow-node {
  padding: 0.8rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  text-align: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.flow-node.client {
  background-color: var(--el-color-info-light-9);
  border: 1px solid var(--el-color-info-light-5);
}

.flow-node.qelos {
  background-color: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
}

.flow-node.plugin {
  background-color: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-5);
}

.flow-arrow {
  color: var(--el-text-color-secondary);
  font-size: 1.2rem;
}

.endpoint {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  max-width: 150px;
  margin-top: 0.3rem;
}

.auth-info {
  margin-bottom: 1.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .api-form {
    width: 100%;
  }
  
  .api-flow-diagram {
    flex-direction: column;
    align-items: center;
  }
  
  .flow-arrow {
    transform: rotate(90deg);
  }
  
  .flow-node {
    width: 100%;
    max-width: 250px;
  }
}
</style>
