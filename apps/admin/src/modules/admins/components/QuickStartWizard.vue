<script setup lang="ts">
import { onBeforeMount, ref, toRefs, computed } from 'vue';
import { useToursStore } from '@/modules/core/store/tours';
import { useAppConfiguration, softResetConfiguration } from '@/modules/configurations/store/app-configuration';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import blueprintsService from '@/services/blueprints-service';
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormUpload from '@/modules/core/components/forms/FormUpload.vue';
import configurationsService from '@/services/configurations-service';
import integrationSourcesService from '@/services/integration-sources-service';
import { ElMessage, ElLoading } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { PALETTES } from '@/modules/core/utils/colors-palettes';
import { IntegrationSourceKind, type WorkspaceLabelDefinition, type IOpenAISource, type IQelosSource } from '@qelos/global-types';

const { t } = useI18n();
const formVisible = ref(false);
const currentStep = ref(1);
const loading = ref(false);

// Form data
const appName = ref('');
const appLogo = ref('');
const selectedTheme = ref('');
const appType = ref('b2c'); 
const openAiToken = ref('');
const aiPurpose = ref('');
const generatedBlueprints = ref([]);
const successfullyCreated = ref([]);

const liveEdit = useLiveEditStore();
const blueprintsStore = useBlueprintsStore();

// Use color palettes for themes
const themes = PALETTES.map(palette => ({
  value: palette.name.toLowerCase().replace(/\s+/g, '-'),
  label: palette.name,
  color: palette.palette.mainColor,
  description: palette.description,
  palette: palette.palette
}));

const toursStore = useToursStore();
onBeforeMount(async () => {
  await toursStore.setCurrentTour('quick-start', 1);
  formVisible.value = toursStore.tourOpen;
});

const { appConfig, promise: appConfigPromise } = useAppConfiguration();
const wsConfig = useWsConfiguration();
const integrationSourcesStore = useIntegrationSourcesStore();

const { promise: integrationPromise, groupedSources } = toRefs(integrationSourcesStore);

onBeforeMount(async () => {
  await Promise.all([appConfigPromise, wsConfig.promise, integrationPromise.value]);
  if (appConfig.value.name) {
    appName.value = appConfig.value.name;
  }
  if (appConfig.value.logoUrl) {
    appLogo.value = appConfig.value.logoUrl;
  }
});

const hasQelosIntegration = computed(() => {
  return groupedSources.value?.['qelos']?.length > 0;
});

const hasOpenAIIntegration = computed(() => {
  return groupedSources.value?.['openai']?.length > 0;
});

// Total steps calculation based on existing integrations
const totalSteps = computed(() => {
  let steps = 7; // Base steps: name, logo, theme, app type, AI purpose, blueprints confirmation, final done screen
  if (!hasOpenAIIntegration.value) {
    steps++; // Add OpenAI token step if no OpenAI integration exists
  }
  return steps;
});

// Step mapping based on existing integrations
const getStepForCurrent = (step: number) => {
  if (step <= 3) return step; // Steps 1-3 are always the same (name, logo, theme)
  if (step === 4) return 4; // App type step
  if (step === 5 && !hasOpenAIIntegration.value) return 5; // OpenAI token step (only if no integration)
  if (step === 5 && hasOpenAIIntegration.value) return 6; // Skip to AI purpose if OpenAI exists
  if (step === 6 && !hasOpenAIIntegration.value) return 6; // AI purpose step (after OpenAI token)
  if (step === 6 && hasOpenAIIntegration.value) return 6; // AI purpose step (direct from app type)
  if (step === 7) return 7; // Blueprints confirmation step
  if (step === 8) return 8; // Final done screen
  return step;
};

async function saveAppName() {
  if (!appName.value) {
    ElMessage.error(t('App name is required'));
    return;
  }
  
  loading.value = true;
  try {
    await configurationsService.update('app-configuration', {
      metadata: {
        ...appConfig.value,
        name: appName.value
      }
    });
    softResetConfiguration();
    currentStep.value++;
  } catch (error) {
    ElMessage.error(t('Failed to save app name'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function saveAppLogo() {
  loading.value = true;
  try {
    await configurationsService.update('app-configuration', {
      metadata: {
        ...appConfig.value,
        logoUrl: appLogo.value
      }
    });
    softResetConfiguration();
    currentStep.value++;
  } catch (error) {
    ElMessage.error(t('Failed to save app logo'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function saveAppTheme() {
  if (!selectedTheme.value) {
    currentStep.value++;
    return;
  }
  loading.value = true;
  try {
    const selectedThemeObj = themes.find(theme => theme.value === selectedTheme.value);
    if (!selectedThemeObj) {
      throw new Error('Selected theme not found');
    }
    
    await liveEdit.changePalette(selectedThemeObj.palette);
    currentStep.value++;
  } catch (error) {
    ElMessage.error(t('Failed to save theme'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function saveAppType() {
  loading.value = true;
  try {
    // For B2B, set workspace config active to true and ensure there's at least one label
    if (appType.value === 'b2b') {
      const labels = wsConfig.metadata.labels || [];
      if (labels.length === 0) {
        // Add a default label if none exists
        const newLabel: WorkspaceLabelDefinition = {
          title: 'Basic',
          description: '',
          value: ['basic']
        };
        labels.push(newLabel);
      }
      
      await configurationsService.update('workspace-configuration', {
        metadata: {
          ...wsConfig.metadata.value,
          isActive: true,
          labels
        }
      });
    }
    
    // Skip OpenAI step if integration already exists
    if (hasOpenAIIntegration.value) {
      currentStep.value = 6; // Jump to AI purpose step
    } else {
      currentStep.value++; // Go to OpenAI token step
    }
    
    wsConfig.reload();
  } catch (error) {
    ElMessage.error(t('Failed to save app type'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function saveOpenAiToken() {
  if (!openAiToken.value) {
    ElMessage.error(t('OpenAI token is required'));
    return;
  }
  
  loading.value = true;
  try {
    // Check if OpenAI integration exists
    if (!hasOpenAIIntegration.value) {
      // Create OpenAI integration source
      const openAiSource: Partial<IOpenAISource> = {
        name: 'OpenAI',
        kind: IntegrationSourceKind.OpenAI,
        labels: [],
        authentication: {
          token: openAiToken.value
        }
      };
      await integrationSourcesService.create(openAiSource);
    }
    
    // Check if Qelos integration exists
    if (!hasQelosIntegration.value) {
      // Create Qelos integration source
      const qelosSource: Partial<IQelosSource> = {
        name: 'Qelos',
        kind: IntegrationSourceKind.Qelos,
        labels: [],
        authentication: {
          password: 'qelos'
        },
        metadata: {
          url: 'http://localhost:3000',
          username: 'qelos'
        }
      };
      await integrationSourcesService.create(qelosSource);
    }

    integrationSourcesStore.retry();
    
    currentStep.value++;
  } catch (error) {
    ElMessage.error(t('Failed to save OpenAI token'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function saveAiPurpose() {
  if (!aiPurpose.value.trim()) {
    currentStep.value+= 2;
    return;
  }

  loading.value = true;
  
  try {
    // Find the first available OpenAI source for blueprint generation
    const openAISources = groupedSources.value?.[IntegrationSourceKind.OpenAI] || [];
    
    if (openAISources.length === 0) {
      ElMessage.error(t('No OpenAI integration found for blueprint generation'));
      currentStep.value++;
      finishSetup();
      return;
    }

    const selectedSourceId = openAISources[0]._id;
    
    const loadingInstance = ElLoading.service({
      lock: true,
      text: t('Generating blueprints based on your AI purpose...'),
      background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
      // Generate blueprints using the AI purpose as prompt
      const response = await fetch(`/api/integrate-source/${selectedSourceId}/no-code-completion/blueprints`, {
        method: 'post',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          prompt: aiPurpose.value
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const generatedBlueprintsData = await response.json();
      
      if (generatedBlueprintsData && generatedBlueprintsData.length > 0) {
        const successfullyCreatedList = [];
        
        // Create blueprints one by one and track successful ones
        for (const blueprint of generatedBlueprintsData) {
          try {
            const createdBlueprint = await blueprintsService.create(blueprint);
            successfullyCreatedList.push(createdBlueprint);
          } catch (error) {
            console.error(`Failed to create blueprint ${blueprint.name}:`, error);
          }
        }
        
        generatedBlueprints.value = generatedBlueprintsData;
        successfullyCreated.value = successfullyCreatedList;
        
        if (successfullyCreated.value.length > 0) {
          ElMessage.success(t(`${successfullyCreated.value.length} blueprints created successfully based on your AI purpose!`));
        } else {
          ElMessage.warning(t('Failed to create blueprints. You can create them manually later.'));
        }
      } else {
        ElMessage.info(t('No blueprints were generated. You can create them manually later.'));
      }
      
    } catch (error) {
      console.error('Error generating blueprints:', error);
      ElMessage.warning(t('Failed to generate blueprints automatically. You can create them manually later.'));
    } finally {
      loadingInstance.close();
    }
    
    currentStep.value++;
  } catch (error) {
    ElMessage.error(t('Failed to process AI purpose'));
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function finishSetup() {
  closeForm();
}

function closeForm() {
  if (toursStore.tourOpen) {
    toursStore.tourFinished();
  }
  formVisible.value = false;
  // clear all form data to default values
  generatedBlueprints.value = [];
  successfullyCreated.value = [];
  currentStep.value = 1;
}

</script>

<template>
  <div><el-button text @click="formVisible = true">{{ $t('Quick Start') }}</el-button></div>
  <el-dialog append-to-body v-model="formVisible" :title="$t('Quick Start')"
             :width="$isMobile ? '100%' : '60%'"
             :close-on-click-modal="false"
             :close-on-press-escape="false"
             @close="closeForm">
    
    <!-- Progress Steps -->
    <div class="wizard-progress">
      <div class="progress-bar">
        <div class="progress-indicator" :style="{ width: `${(getStepForCurrent(currentStep) - 1) / (totalSteps - 1) * 100}%` }"></div>
      </div>
      <div class="steps-container">
        <div 
          v-for="step in totalSteps" 
          :key="step"
          class="step-circle"
          :class="{ 
            'active': getStepForCurrent(currentStep) === step, 
            'completed': getStepForCurrent(currentStep) > step,
            'pending': getStepForCurrent(currentStep) < step 
          }"
        >
          <span v-if="getStepForCurrent(currentStep) <= step">{{ step }}</span>
          <i v-else class="el-icon-check"></i>
        </div>
      </div>
    </div>
    
    <!-- Step 1: App Name -->
    <div v-if="getStepForCurrent(currentStep) === 1" class="step-container">
      <div class="step-header">
        <h2>{{ $t('What is your app name?') }}</h2>
        <p class="step-description">{{ $t('This will be displayed as the title of your application.') }}</p>
      </div>
      <el-form @submit.prevent="saveAppName">
        <FormInput v-model="appName" type="text" :placeholder="$t('Enter your app name')" />
        <div class="form-actions">
          <el-button type="primary" native-type="submit" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
    
    <!-- Step 2: App Logo -->
    <div v-if="getStepForCurrent(currentStep) === 2" class="step-container">
      <div class="step-header">
        <h2>{{ $t('Enter your app logo') }}</h2>
        <p class="step-description">{{ $t('This will be displayed as the logo of your application.') }}</p>
      </div>
      <el-form @submit.prevent="saveAppLogo">
        <FormInput v-model="appLogo" type="url" :placeholder="$t('Enter logo URL')" />
        <div v-if="appLogo" class="logo-preview">
          <img :src="appLogo" :alt="appName" />
        </div>
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" native-type="submit" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
        <!-- Step 3: Theme Selection -->
    <div v-if="getStepForCurrent(currentStep) === 3" class="step-container">
      <div class="step-header">
        <h2>{{ $t('Select an initial theme') }}</h2>
        <p class="step-description">{{ $t('Choose a theme that matches your brand identity.') }}</p>
      </div>
      <el-form>
        <div class="theme-options">
          <div 
            v-for="theme in themes" 
            :key="theme.value" 
            class="theme-option"
            :class="{ 'selected': selectedTheme === theme.value }"
            @click="selectedTheme = theme.value"
          >
            <div class="theme-color-preview">
              <div class="main-color" :style="{ backgroundColor: theme.color }"></div>
              <div class="color-palette">
                <div class="palette-color" :style="{ backgroundColor: theme.palette.secondaryColor }"></div>
                <div class="palette-color" :style="{ backgroundColor: theme.palette.thirdColor }"></div>
                <div class="palette-color" :style="{ backgroundColor: theme.palette.bgColor }"></div>
              </div>
            </div>
            <div class="theme-label">{{ theme.label }}</div>
            <div class="theme-description">{{ theme.description }}</div>
          </div>
        </div>
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" @click="saveAppTheme" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
    
    <!-- Step 4: App Type -->
    <div v-if="getStepForCurrent(currentStep) === 4" class="step-container">
      <div class="step-header">
        <h2>{{ $t('Is your app made for B2B or B2C?') }}</h2>
        <p class="step-description">{{ $t('This will configure your workspace settings appropriately.') }}</p>
      </div>
      <el-form @submit.prevent="saveAppType">
        <div class="app-type-cards">
          <div 
            class="app-type-card" 
            :class="{ 'selected': appType === 'b2b' }" 
            @click="appType = 'b2b'"
          >
            <div class="app-type-icon">
              <i class="el-icon-office-building"></i>
            </div>
            <div class="app-type-title">{{ $t('B2B') }}</div>
            <div class="app-type-subtitle">{{ $t('Business to Business') }}</div>
          </div>
          <div 
            class="app-type-card" 
            :class="{ 'selected': appType === 'b2c' }" 
            @click="appType = 'b2c'"
          >
            <div class="app-type-icon">
              <i class="el-icon-user"></i>
            </div>
            <div class="app-type-title">{{ $t('B2C') }}</div>
            <div class="app-type-subtitle">{{ $t('Business to Consumer') }}</div>
          </div>
        </div>
        
        <div class="app-type-description">
          <div v-if="appType === 'b2b'" class="help-text">
            {{ $t('B2B will enable workspace management and ensure at least one workspace label exists.') }}
          </div>
          <div v-else class="help-text">
            {{ $t('B2C will keep workspace management disabled.') }}
          </div>
        </div>
        
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" native-type="submit" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
    
    <!-- Step 5: OpenAI Token -->
    <div v-if="getStepForCurrent(currentStep) === 5 && !hasOpenAIIntegration" class="step-container">
      <div class="step-header">
        <h2>{{ $t('Add your OpenAI token') }}</h2>
        <p class="step-description">{{ $t('Connect your app to OpenAI for AI capabilities.') }}</p>
      </div>
      <el-form @submit.prevent="saveOpenAiToken">
        <el-input 
          v-model="openAiToken" 
          type="password" 
          show-password 
          :placeholder="$t('Enter your OpenAI API key')" 
          size="large"
        />
        <div class="help-text" style="margin: 16px 0">
          {{ $t('Your API key will be stored securely and used for AI integrations.') }}
        </div>
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" native-type="submit" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
    
    <!-- Step 6: AI Purpose -->
    <div v-if="getStepForCurrent(currentStep) === 6" class="step-container">
      <div class="step-header">
        <h2>{{ $t('What should your app do with AI?') }}</h2>
        <p class="step-description">{{ $t('Describe how you want to use AI in your application.') }}</p>
      </div>
      <el-form @submit.prevent="saveAiPurpose"  >
        <el-input 
          v-model="aiPurpose" 
          type="textarea" 
          :rows="4"
          :placeholder="$t('Describe what you want to achieve with AI in your app...')" 
          size="large"
        />
        <div class="help-text" style="margin: 16px 0">
          {{ $t('This will help set up blueprints using the chat completion API.') }}
        </div>
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" native-type="submit" :loading="loading" size="large">
            {{ $t('Next') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>
    <!-- Step 7: Generated Blueprints -->
    <div v-if="getStepForCurrent(currentStep) === 7" class="step-container">
      <div class="step-header">
        <h2>{{ $t('Generated Blueprints') }}</h2>
        <p class="step-description">{{ $t('Here are the blueprints generated based on your AI purpose. They have been automatically created in your workspace.') }}</p>
      </div>
      <el-form>
        <div v-if="generatedBlueprints.length > 0" class="blueprints-list">
          <div class="blueprints-summary">
            <i class="el-icon-success"></i>
            <span>{{ $t('Successfully created') }} <strong>{{ successfullyCreated.length }}</strong> {{ $t('blueprints') }}</span>
          </div>
          <div class="blueprints-compact">
            <div v-for="(blueprint, index) in successfullyCreated" :key="blueprint.id" class="blueprint-item">
              <span class="blueprint-number">{{ index + 1 }}.</span>
              <span class="blueprint-name">{{ blueprint.name }}</span>
              <span class="blueprint-properties">({{ Object.keys(blueprint.properties || {}).length }} {{ $t('props') }})</span>
            </div>
          </div>
        </div>
        <div v-else class="no-blueprints">
          <i class="el-icon-info"></i>
          <p>{{ $t('No blueprints were generated. You can create them manually later from the No-Code section.') }}</p>
        </div>
        <div class="form-actions">
          <el-button @click="currentStep--" size="large">
            <i class="el-icon-arrow-left"></i> {{ $t('Back') }}
          </el-button>
          <el-button type="primary" @click="currentStep++" size="large">
            {{ $t('Continue') }} <i class="el-icon-arrow-right"></i>
          </el-button>
        </div>
      </el-form>
    </div>

    <!-- Step 8: Final Done Screen -->
    <div v-if="getStepForCurrent(currentStep) === 8" class="step-container final-step">
      <div class="completion-content">
        <div class="success-icon">
          <i class="el-icon-success"></i>
        </div>
        <h2>{{ $t('Setup Complete!') }}</h2>
        <p class="completion-message">{{ $t('Your Qelos application has been successfully configured. You can now start building your no-code solutions.') }}</p>
        <div class="completion-stats">
          <div class="stat-card">
            <div class="stat-icon app-icon">
              <i class="el-icon-s-home"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ appName || $t('Your App') }}</div>
              <div class="stat-label">{{ $t('Application Name') }}</div>
            </div>
          </div>
          <div class="stat-card" v-if="successfullyCreated.length > 0">
            <div class="stat-icon blueprints-icon">
              <i class="el-icon-document-add"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ successfullyCreated.length }}</div>
              <div class="stat-label">{{ $t('Blueprints Created') }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon type-icon">
              <i class="el-icon-office-building" v-if="appType === 'b2b'"></i>
              <i class="el-icon-user" v-else></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ appType.toUpperCase() }}</div>
              <div class="stat-label">{{ $t('App Type') }}</div>
            </div>
          </div>
        </div>
        <div class="final-actions">
          <el-button type="primary" @click="finishSetup" size="large" class="done-button">
            {{ $t('DONE') }}
          </el-button>
        </div>
      </div>
    </div>
    
  </el-dialog>
</template>

<style scoped>
img {
  max-height: 50px;
  max-width: 100px;
}

.step-container {
  padding: 20px 0;
  max-width: 600px;
  margin: 0 auto;
}

.step-header {
  margin-bottom: 24px;
  text-align: center;
}

.step-header h2 {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.step-description {
  color: #606266;
  font-size: 16px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
}

.wizard-progress {
  margin-bottom: 30px;
  padding: 0 20px;
}

.progress-bar {
  height: 4px;
  background-color: #e4e7ed;
  border-radius: 4px;
  margin-bottom: 15px;
  position: relative;
  overflow: hidden;
}

.progress-indicator {
  position: absolute;
  height: 100%;
  background-color: var(--el-color-primary);
  transition: width 0.3s ease;
}

.steps-container {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.step-circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.step-circle.active {
  background-color: var(--el-color-primary);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
}

.step-circle.completed {
  background-color: var(--el-color-success);
  color: white;
}

.step-circle.pending {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  color: #909399;
}

.logo-preview {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  display: inline-block;
}

.theme-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  margin-top: 15px;
}

.theme-option {
  width: 120px;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.theme-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-option.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: rgba(64, 158, 255, 0.05);
}

.theme-color-preview {
  margin-bottom: 8px;
}

.main-color {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 auto 6px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-palette {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 6px;
}

.palette-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #eee;
}

.theme-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 3px;
}

.theme-description {
  font-size: 10px;
  color: #909399;
  line-height: 1.3;
}

.help-text {
  color: #606266;
  font-size: 14px;
  margin-top: 5px;
  line-height: 1.5;
  text-align: center;
}

.app-type-cards {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.app-type-card {
  width: 180px;
  height: 180px;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.app-type-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.1);
}

.app-type-card.selected {
  border-color: var(--el-color-primary);
  background-color: rgba(64, 158, 255, 0.1);
  box-shadow: 0 6px 16px 0 rgba(64, 158, 255, 0.2);
}

.app-type-icon {
  font-size: 40px;
  margin-bottom: 15px;
  color: var(--el-color-primary);
}

.app-type-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 5px;
}

.app-type-subtitle {
  font-size: 14px;
  color: #909399;
}

.app-type-description {
  margin: 20px 0;
}

.blueprints-summary {
  text-align: center;
  margin-bottom: 10px;
}

.blueprints-compact {
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.blueprint-item {
  padding: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.blueprint-item:last-child {
  border-bottom: none;
}

.blueprint-number {
  font-size: 14px;
  font-weight: 600;
  margin-right: 8px;
}

.blueprint-name {
  font-size: 14px;
  font-weight: 600;
}

.blueprint-properties {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.no-blueprints {
  text-align: center;
  margin-top: 20px;
}

.no-blueprints i {
  font-size: 24px;
  margin-bottom: 10px;
}

.final-step {
  padding: 30px 0;
  text-align: center;
}

.completion-content {
  max-width: 400px;
  margin: 0 auto;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: var(--el-color-success);
}

.completion-message {
  font-size: 16px;
  margin-bottom: 20px;
}

.completion-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  min-width: 160px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-primary-light-3));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px 0 rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-5);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

.app-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.blueprints-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.type-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
}

.stat-content {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #2c3e50;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive design for mobile */
@media (max-width: 768px) {
  .completion-stats {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  
  .stat-card {
    min-width: 200px;
    max-width: 250px;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stat-card {
    min-width: unset;
    width: 100%;
    max-width: 300px;
    padding: 20px 16px;
  }
  
  .stat-icon {
    width: 45px;
    height: 45px;
    font-size: 22px;
    margin-bottom: 12px;
  }
  
  .stat-value {
    font-size: 18px;
  }
}

/* Animations for step transitions */
.step-container {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.done-button {
  width: 100%;
  font-size: 18px;
  font-weight: 600;
}
</style>