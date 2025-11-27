<template>
  <div class="configurations-list">    

    <!-- Loading state -->
    <div v-if="!list" class="loading-state">
      <el-skeleton :rows="3" animated />
      <el-skeleton :rows="3" animated />
    </div>
    
    <!-- Empty state -->
    <el-empty v-else-if="list && filteredList.length === 0" description="No configurations found">
      <template #image>
        <el-icon><DocumentRemove style="font-size: 48px" /></el-icon>
      </template>
      <el-button type="primary" @click="clearFilters">Clear filters</el-button>
    </el-empty>
    
    <!-- Configurations list -->
    <div v-else class="configurations-grid">
      <div
        v-for="config in filteredList" 
        :key="config.key"
        class="config-card"
        :class="{'system-config': config.key === 'app-configuration'}"
        @click="navigateToEdit(config, $event)"
      >
        <div class="config-header">
          <div class="config-title">
            <h3>
              <router-link :to="{name: 'editConfiguration', params: {key: config.key}}" @click.stop>
                {{ getConfigTitle(config) }}
              </router-link>
            </h3>
            <el-tag 
              size="small" 
              :type="config.key === 'app-configuration' ? 'danger' : (config.public ? 'success' : 'info')"
              class="config-tag"
            >
              {{ config.key === 'app-configuration' ? 'System' : (config.public ? 'Public' : 'Private') }}
            </el-tag>
          </div>
          <div class="config-description" v-if="getConfigDescription(config)">
            {{ getConfigDescription(config) }}
          </div>
        </div>
        
        <div class="config-details">
          <h4>{{ $t('Details') }}</h4>
          <div class="config-meta">
            <div v-if="config.updatedAt" class="update-time">
              <el-icon><Calendar /></el-icon>
              <span>{{ $t('Updated') }}: {{ formatDate(config.updatedAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="config-actions">
          <el-tooltip content="Edit configuration" placement="top">
            <el-button 
              type="primary" 
              circle 
              @click.stop="navigateToEdit(config)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip 
            v-if="config.key !== 'app-configuration'" 
            content="Delete configuration" 
            placement="top"
          >
            <el-button 
              type="danger" 
              circle 
              @click.stop="remove(config)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <AddNewCard 
        :title="$t('Create new Configuration')"
        :description="$t('Add a new configuration to your collection')"
        :to="{ name: 'createConfiguration' }"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useConfigurationsList } from '../compositions/configurations';
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import configurationsService from '@/services/apis/configurations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { Calendar, Edit, Delete, DocumentRemove } from '@element-plus/icons-vue';

import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();  

type RequiredConfigurationDefinition = {
  title: string;
  description: string;
  kind?: string;
  public: boolean;
  metadata: Record<string, any>;
};

const requiredConfigurations: Record<string, RequiredConfigurationDefinition> = {
  'app-configuration': {
    title: 'Application Branding & Theme',
    description: 'Control your app name, app URL, logo, direction, language, and theme.',
    kind: 'app',
    public: true,
    metadata: {
      colorsPalette: {
        mainColor: '#264653',
        mainColorLight: '#1c4252',
        textColor: '#1c4252',
        secondaryColor: '#2a9d8f',
        thirdColor: '#e9c46a',
        bgColor: '#ffffff',
        bordersColor: '#e2e8f0',
        inputsTextColor: '#1c4252',
        inputsBgColor: '#f8fafc',
        linksColor: '#2a9d8f',
        navigationBgColor: '#1c4252',
        negativeColor: '#9b7a3a',
        buttonTextColor: '#ffffff',
        buttonBgColor: '#264653',
        focusColor: '#2a9d8f',
        fontFamily: 'Helvetica, Arial, sans-serif',
        headingsFontFamily: 'Helvetica, Arial, sans-serif',
        baseFontSize: 16,
        borderRadius: 4,
        buttonRadius: 4,
        spacing: 'normal',
        shadowStyle: 'light',
        animationSpeed: 250
      },
      description: '',
      direction: 'ltr',
      homeScreen: '',
      keywords: '',
      language: 'en',
      logoUrl: '',
      name: '',
      scriptUrl: '',
      slogan: '',
      themeStylesUrl: '',
      borderRadius: 5,
      baseFontSize: 16,
      websiteUrls: []
    }
  },
  'auth-configuration': {
    title: 'Authentication Experience',
    description: 'Customize login flows, user fields, and available social providers.',
    kind: 'auth',
    public: true,
    metadata: {
      treatUsernameAs: 'email',
      formPosition: 'right',
      loginTitle: '',
      showLoginPage: true,
      showRegisterPage: false,
      allowSocialAutoRegistration: true,
      additionalUserFields: [],
      socialLoginsSources: {},
      slots: {},
      disableUsernamePassword: false
    }
  },
  'ssr-scripts': {
    title: 'SSR Scripts',
    description: 'SSR scripts configuration.',
    kind: 'ssr',
    public: true,
    metadata: {
      head: '',
      body: ''
    }
  },
  'workspace-configuration': {
    title: 'Workspace Mode & Labels',
    description: 'Enable multi-workspace mode, labels, and creation permissions.',
    kind: 'workspace',
    public: true,
    metadata: {
      isActive: false,
      creationPrivilegedRoles: [],
      viewMembersPrivilegedWsRoles: [],
      labels: [],
      allowNonLabeledWorkspaces: true,
      allowNonWorkspaceUsers: true
    }
  },
  'users-header': {
    title: 'Users Header Template',
    description: 'Design a custom HTML header for the users list view.',
    kind: 'users-header',
    public: true,
    metadata: {
      html: '',
      active: false
    }
  }
};

const requiredConfigKeys = Object.keys(requiredConfigurations);

const ensuringDefaults = ref(false);
const ensuredKeys = new Set<string>();

const cloneMetadata = (metadata: Record<string, any>) => JSON.parse(JSON.stringify(metadata));

// Accept filter type and search query from parent component
const props = defineProps({
  filterType: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  }
});

const { list, retry } = useConfigurationsList();

async function createRequiredConfiguration(key: string) {
  const definition = requiredConfigurations[key];
  if (!definition) return;

  await configurationsService.create({
    key,
    public: definition.public,
    kind: definition.kind,
    description: definition.description,
    metadata: cloneMetadata(definition.metadata)
  });
  ensuredKeys.add(key);
}

watch(list, async (configs) => {
  if (!Array.isArray(configs) || ensuringDefaults.value) {
    return;
  }

  const missingKeys = requiredConfigKeys.filter((key) => {
    if (ensuredKeys.has(key)) {
      return false;
    }
    return !configs.some((config) => config.key === key);
  });

  if (!missingKeys.length) {
    return;
  }

  ensuringDefaults.value = true;
  try {
    for (const key of missingKeys) {
      await createRequiredConfiguration(key);
    }
    await retry();
  } catch (error) {
    console.error('[ConfigurationsList] Failed to auto-create required configurations', error);
  } finally {
    ensuringDefaults.value = false;
  }
}, { immediate: true });

const getConfigTitle = (config: { key: string }) => {
  return requiredConfigurations[config.key]?.title || t(config.key);
};

const getConfigDescription = (config: { key: string; description?: string }) => {
  return config.description || requiredConfigurations[config.key]?.description || '';
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Filter and search logic
const filteredList = computed(() => {
  if (!list.value) return [];
  
  return list.value.filter(config => {
    const matchesSearch = props.searchQuery === '' || 
      t(config.key).toLowerCase().includes(props.searchQuery.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(props.searchQuery.toLowerCase()));
      
    const matchesFilter = props.filterType === '' ||
      (props.filterType === 'public' && config.public) ||
      (props.filterType === 'private' && !config.public);
      
    return matchesSearch && matchesFilter;
  });
});

const emit = defineEmits(['update:filterType', 'update:searchQuery']);

const clearFilters = () => {
  // Emit events to update parent's filterType and searchQuery
  emit('update:filterType', '');
  emit('update:searchQuery', '');
};

const navigateToEdit = (config, event?: MouseEvent) => {
  if (!event || event.target === event.currentTarget || (event.target as HTMLElement).closest('.config-card') === event.currentTarget) {
    router.push({ name: 'editConfiguration', params: { key: config.key } });
  }
};

const { submit: removeFn } = useSubmitting((config) => configurationsService.remove(config.key), {
  success: 'Configuration removed successfully',
  error: 'Failed to remove configuration'
}, retry);

const remove = useConfirmAction(removeFn);

// No artificial loading delay - we want maximum performance
</script>

<style scoped>
.configurations-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0 1rem;
}

.configurations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
}

.config-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
}

.config-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.system-config {
  border-left: 3px solid var(--el-color-danger);
}

.config-header {
  margin-bottom: 16px;
}

.config-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.config-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.config-title a {
  color: inherit;
  text-decoration: none;
}

.config-title a:hover {
  text-decoration: underline;
}

.config-tag {
  flex-shrink: 0;
}

.config-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-details {
  flex: 1;
  margin-bottom: 16px;
}

.config-details h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-block-end: 1px solid #ebeef5;
  padding-block-end: 8px;
}

.config-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.update-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-block-start: 12px;
  border-block-start: 1px solid #ebeef5;
}

.loading-state {
  padding: 20px;
}

@media (max-width: 768px) {
  .configurations-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .configurations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>