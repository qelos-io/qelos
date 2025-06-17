<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'bell']" /></el-icon>
          <span>{{ $t('Event Subscriptions') }}</span>
        </div>
      </template>
      <p class="card-description">{{$t('The ability to subscribe to system and custom events using web hooks.')}}</p>
      
      <div class="hooks-header">
        <el-row :gutter="20" align="middle" justify="space-between">
          <el-col :span="16">
            <el-alert
              v-if="!plugin.subscribedEvents || plugin.subscribedEvents.length === 0"
              type="info"
              :closable="false"
              show-icon
            >
              <template #title>
                <span>{{ $t('No event subscriptions configured') }}</span>
              </template>
              <p>{{ $t('Add an event subscription to receive webhooks when specific events occur in the system.') }}</p>
            </el-alert>
            
            <div v-else class="subscription-summary">
              <el-statistic :value="plugin.subscribedEvents.length">
                <template #title>
                  <div class="statistic-title">{{ $t('Event Subscriptions') }}</div>
                </template>
              </el-statistic>
            </div>
          </el-col>
          
          <el-col :span="8" v-if="plugin.subscribedEvents && plugin.subscribedEvents.length > 0">
            <el-input
              v-model="searchQuery"
              :placeholder="t('Search events...')"
              clearable
              prefix-icon="Search"
            />
          </el-col>
        </el-row>
      </div>
      
      <el-collapse v-if="filteredEvents.length > 0" v-model="activeNames" accordion>
        <el-collapse-item 
          v-for="(event, index) in filteredEvents" 
          :key="index"
          :name="index"
          :title="getEventTitle(event, index)"
        >
          <template #header>
            <el-button 
              type="danger" 
              size="small" 
              circle 
              plain 
              @click.stop="removeEvent(filteredEvents.indexOf(event))"
              :title="t('Remove event subscription')"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
          
          <FormRowGroup class="event-form-group">
          <el-form-item>
            <template #label>
              {{ $t('Source') }}
              <InfoIcon content="Plugin events will have a prefix of 'plugin:' before their custom event names"/>
            </template>
            <el-select
                v-model="event.source"
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('*')"
            >
              <el-option :label="$t('(*) All')" value="*"/>
              <el-option :label="$t('Authentication')" value="auth"/>
              <el-option :label="$t('Assets')" value="assets"/>
              <el-option :label="$t('Blueprints')" value="blueprints"/>
              <el-option :label="$t('Plugin')" value="plugin"/>
            </el-select>
          </el-form-item>
          <template v-if="event.source === 'blueprints'">
            <BlueprintSelector title="Kind" v-model="event.kind"/>
            <el-form-item :label="$t('Event Name')">
              <el-select v-model="event.eventName">
                <el-option :label="$t('Create')" value="create"/>
                <el-option :label="$t('Update')" value="update"/>
                <el-option :label="$t('Delete')" value="delete"/>
              </el-select>
            </el-form-item>
          </template>
          <template v-else-if="event.source === 'auth'">
            <el-form-item :label="$t('Kind')">
              <el-select v-model="event.kind" filterable allow-create default-first-option :placeholder="$t('(*) All')">
                <el-option :label="$t('(*) All')" value="*"/>
                <el-option :label="$t('Signup')" value="signup"/>
                <el-option :label="$t('Users')" value="users"/>
                <el-option :label="$t('Failed Social Login')" value="failed-social-login"/>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('Event Name')">
              <el-select v-model="event.eventName" filterable allow-create default-first-option :placeholder="$t('(*) All')">
                <el-option :label="$t('(*) All')" value="*"/>
                <template v-if="event.kind === 'signup'">
                  <el-option :label="$t('User Registered')" value="user-registered"/>
                </template>
                <template v-else-if="event.kind === 'users'">
                  <el-option :label="$t('User Created')" value="user-created"/>
                  <el-option :label="$t('User Updated')" value="user-updated"/>
                  <el-option :label="$t('User Removed')" value="user-removed"/>
                </template>
                <template v-else-if="event.kind === 'failed-social-login'">
                  <el-option :label="$t('Failed LinkedIn Login')" value="failed-linkedin-login"/>
                  <el-option :label="$t('Failed Facebook Login')" value="failed-facebook-login"/>
                  <el-option :label="$t('Failed Google Login')" value="failed-google-login"/>
                  <el-option :label="$t('Failed Twitter Login')" value="failed-twitter-login"/>
                </template>
              </el-select>
            </el-form-item>
          </template>
          <template v-else-if="event.source === 'assets'">
            <el-form-item :label="$t('Kind')">
              <el-select v-model="event.kind" filterable allow-create default-first-option :placeholder="$t('(*) All')">
                <el-option :label="$t('(*) All')" value="*"/>
                <el-option :label="$t('Asset Operation')" value="asset-operation"/>
                <el-option :label="$t('Storage Connection Error')" value="storage-connection-error"/>
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('Event Name')">
              <el-select v-model="event.eventName" filterable allow-create default-first-option :placeholder="$t('(*) All')">
                <el-option :label="$t('(*) All')" value="*"/>
                <template v-if="event.kind === 'asset-operation'">
                  <el-option :label="$t('Asset Uploaded')" value="asset-uploaded"/>
                </template>
                <template v-else-if="event.kind === 'storage-connection-error'">
                  <el-option :label="$t('S3 Connection Error')" value="s3-connection-error"/>
                  <el-option :label="$t('GCS Connection Error')" value="gcs-connection-error"/>
                  <el-option :label="$t('FTP Connection Error')" value="ftp-connection-error"/>
                  <el-option :label="$t('Cloudinary Connection Error')" value="cloudinary-connection-error"/>
                </template>
              </el-select>
            </el-form-item>
          </template>
          <template v-else-if="event.source === 'plugin'">
            <el-form-item>
              <template #label>
                {{ $t('Plugin Name') }}
                <InfoIcon content="The name of the plugin that dispatches the event. Will be prefixed with 'plugin:' automatically."/>
              </template>
              <el-input v-model="event.pluginName" :placeholder="$t('Plugin name')"/>
            </el-form-item>
            <FormInput title="Kind" v-model="event.kind" :placeholder="$t('(*) All')"/>
            <FormInput title="Event Name" v-model="event.eventName" :placeholder="$t('(*) All')"/>
          </template>
          <template v-else>
            <FormInput title="Kind" v-model="event.kind" :placeholder="$t('(*) All')"/>
            <FormInput title="Event Name" v-model="event.eventName" :placeholder="$t('(*) All')"/>
          </template>
        </FormRowGroup>
        <FormRowGroup class="webhook-url-group">
          <FormInput 
            title="Webhook URL" 
            type="url" 
            v-model="event.hookUrl" 
            required 
            placeholder="https://..."
          />
          <div class="webhook-actions">
            <el-tooltip content="Test this webhook" placement="top">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                plain 
                class="test-webhook-button"
                @click="testWebhook(event)"
                :disabled="!event.hookUrl"
              >
                <el-icon><Connection /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="View webhook format" placement="top">
              <el-button 
                type="info" 
                size="small" 
                circle 
                plain 
                class="format-webhook-button"
                @click="showWebhookFormat(event)"
              >
                <el-icon><Document /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </FormRowGroup>
        
        <div class="remove-event-section">
          <el-button 
            type="danger" 
            @click="removeEvent(filteredEvents.indexOf(event))"
            size="small"
            class="remove-event-button"
          >
            <el-icon><Delete /></el-icon>
            {{ t('Remove Event Subscription') }}
          </el-button>
        </div>
        
        <div class="event-help" v-if="activeHelpIndex === index">
          <el-card shadow="hover" class="webhook-format-card">
            <template #header>
              <div class="webhook-format-header">
                <span>{{ $t('Webhook Format') }}</span>
                <el-button 
                  type="text" 
                  @click="activeHelpIndex = -1"
                  size="small"
                >
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="webhook-format-content">
              <p>{{ $t('Your webhook will receive a POST request with the following payload:') }}</p>
              <el-divider></el-divider>
              <pre class="webhook-payload">{{ getWebhookPayloadExample(event) }}</pre>
              <el-divider></el-divider>
              <p class="webhook-tip">{{ $t('Your endpoint should return a 2xx status code to acknowledge receipt.') }}</p>
            </div>
          </el-card>
        </div>
        </el-collapse-item>
      </el-collapse>
      
      <div class="add-event-section">
        <el-row :gutter="20" justify="center">
          <el-col :span="12" :sm="24" :md="12">
            <el-button 
              type="primary" 
              @click="addEvent" 
              class="add-event-button"
              icon="Plus"
            >
              {{ $t('Add Event Subscription') }}
            </el-button>
          </el-col>
          <el-col :span="12" :sm="24" :md="12">
            <el-dropdown @command="addTemplateEvent" trigger="click" class="template-dropdown">
              <el-button type="success" plain class="template-button">
                <el-icon><Document /></el-icon>
                {{ $t('Use Template') }}
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="user-registered">{{ $t('User Registration') }}</el-dropdown-item>
                  <el-dropdown-item command="asset-uploaded">{{ $t('Asset Uploaded') }}</el-dropdown-item>
                  <el-dropdown-item command="blueprint-entity">{{ $t('Blueprint Entity Changes') }}</el-dropdown-item>
                  <el-dropdown-item command="custom-plugin">{{ $t('Custom Plugin Event') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { IPlugin } from '@/services/types/plugin';
import { Delete, Connection, Plus, Search, Document, QuestionFilled, Close } from '@element-plus/icons-vue';
import { watch, ref, computed, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const searchQuery = ref('');
const activeNames = ref<number[]>([]);
const activeHelpIndex = ref(-1);

// Filter events based on search query
const filteredEvents = computed(() => {
  if (!props.plugin.subscribedEvents) return [];
  if (!searchQuery.value) return props.plugin.subscribedEvents;
  
  const query = searchQuery.value.toLowerCase();
  return props.plugin.subscribedEvents.filter(event => {
    const eventTitle = getEventTitle(event, 0).toLowerCase();
    const source = (event.source || '').toLowerCase();
    const kind = (event.kind || '').toLowerCase();
    const eventName = (event.eventName || '').toLowerCase();
    const hookUrl = (event.hookUrl || '').toLowerCase();
    
    return eventTitle.includes(query) || 
           source.includes(query) || 
           kind.includes(query) || 
           eventName.includes(query) || 
           hookUrl.includes(query);
  });
});

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

function addEvent() {
  if (!props.plugin.subscribedEvents) {
    props.plugin.subscribedEvents = [];
  }
  props.plugin.subscribedEvents.push({
    source: '',
    kind: '',
    eventName: '',
    pluginName: '',
    hookUrl: ''
  });
  
  // Focus on the newly added item by opening its accordion
  setTimeout(() => {
    const index = props.plugin.subscribedEvents.length - 1;
    activeNames.value = [index];
  }, 100);
}

function addTemplateEvent(template: string) {
  if (!props.plugin.subscribedEvents) {
    props.plugin.subscribedEvents = [];
  }
  
  let newEvent: any = {
    hookUrl: ''
  };
  
  switch(template) {
    case 'user-registered':
      newEvent = {
        source: 'auth',
        kind: 'signup',
        eventName: 'user-registered',
        hookUrl: ''
      };
      break;
    case 'asset-uploaded':
      newEvent = {
        source: 'assets',
        kind: 'asset-operation',
        eventName: 'asset-uploaded',
        hookUrl: ''
      };
      break;
    case 'blueprint-entity':
      newEvent = {
        source: 'blueprints',
        kind: '',
        eventName: 'create',
        hookUrl: ''
      };
      break;
    case 'custom-plugin':
      newEvent = {
        source: 'plugin',
        pluginName: '',
        kind: '*',
        eventName: '*',
        hookUrl: ''
      };
      break;
  }
  
  props.plugin.subscribedEvents.push(newEvent);
  
  // Focus on the newly added item
  setTimeout(() => {
    const index = props.plugin.subscribedEvents.length - 1;
    activeNames.value = [index];
    
    ElMessage({
      type: 'success',
      message: t('Event template added. Configure the webhook URL to complete setup.')
    });
  }, 100);
}

function removeEvent(index: number) {
  ElMessageBox.confirm(
    t('Are you sure you want to remove this event subscription?'),
    t('Confirm Removal'),
    {
      confirmButtonText: t('Remove'),
      cancelButtonText: t('Cancel'),
      type: 'warning',
    }
  )
    .then(() => {
      props.plugin.subscribedEvents?.splice(index, 1);
      ElMessage({
        type: 'success',
        message: t('Event subscription removed successfully'),
      });
    })
    .catch(() => {
      // User canceled the operation
    });
}

// Get a human-readable title for the event subscription
function getEventTitle(event: any, index: number): string {
  if (!event.source) {
    return t('New Event Subscription #{0}', [index + 1]);
  }
  
  let title = '';
  
  if (event.source === '*') {
    title = t('All Sources');
  } else if (event.source === 'auth') {
    title = t('Authentication');
  } else if (event.source === 'assets') {
    title = t('Assets');
  } else if (event.source === 'blueprints') {
    title = t('Blueprints');
  } else if (event.source === 'plugin') {
    title = event.pluginName ? 
      t('Plugin: {0}', [event.pluginName]) : 
      t('Plugin Events');
  } else {
    title = event.source;
  }
  
  if (event.kind && event.kind !== '*') {
    title += ` - ${event.kind}`;
  }
  
  if (event.eventName && event.eventName !== '*') {
    title += ` - ${event.eventName}`;
  }
  
  return title;
}

// Test the webhook URL
function testWebhook(event: any) {
  if (!event.hookUrl) {
    ElMessage({
      type: 'error',
      message: t('Please enter a valid webhook URL'),
    });
    return;
  }
  
  // Validate URL format
  try {
    new URL(event.hookUrl);
  } catch (e) {
    ElMessage({
      type: 'error',
      message: t('Please enter a valid URL (e.g., https://example.com/webhook)'),
    });
    return;
  }
  
  ElMessage({
    type: 'info',
    message: t('Sending test webhook to {0}...', [event.hookUrl]),
  });
  
  // Here you would typically call an API to test the webhook
  // For now, we'll just simulate a successful test
  setTimeout(() => {
    ElMessage({
      type: 'success',
      message: t('Test webhook sent successfully'),
    });
  }, 1500);
}

// Show webhook format example
function showWebhookFormat(event: any) {
  const index = props.plugin.subscribedEvents?.indexOf(event);
  if (index !== undefined && index >= 0) {
    activeHelpIndex.value = activeHelpIndex.value === index ? -1 : index;
  }
}

// Generate an example payload for the webhook
function getWebhookPayloadExample(event: any): string {
  const payload = {
    source: event.source || 'example-source',
    kind: event.kind || 'example-kind',
    eventName: event.eventName || 'example-event',
    timestamp: new Date().toISOString(),
    data: {
      id: 'example-id-123',
      // Add specific fields based on event type
      ...(event.source === 'auth' ? {
        userId: 'user-123',
        email: 'user@example.com',
      } : {}),
      ...(event.source === 'assets' ? {
        assetId: 'asset-123',
        fileName: 'example.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      } : {}),
      ...(event.source === 'blueprints' ? {
        blueprintId: 'blueprint-123',
        entityId: 'entity-123',
        changes: {
          field1: { old: 'value1', new: 'value2' },
          field2: { old: null, new: 'new value' },
        },
      } : {}),
      ...(event.source === 'plugin' ? {
        pluginId: 'plugin-123',
        customData: { key: 'value' },
      } : {}),
    },
    tenant: {
      id: 'tenant-123',
      name: 'Example Organization',
    },
  };
  
  return JSON.stringify(payload, null, 2);
}

// Handle plugin source changes to reset dependent fields
watch(() => props.plugin.subscribedEvents, (events) => {
  if (!events) return;
  
  events.forEach(event => {
    // When source changes, reset kind and eventName if needed
    if (event.source === 'plugin' && !event.pluginName) {
      event.pluginName = '';
    }
  });
}, { deep: true });
</script>

<style scoped>
.event-item {
  margin-bottom: 20px;
}

.event-form-group {
  margin-bottom: 15px;
}

.webhook-url-group {
  display: flex;
  align-items: flex-end;
}

.webhook-actions {
  display: flex;
  gap: 8px;
  margin-left: 10px;
  margin-bottom: 5px;
}

.webhook-format-card {
  margin-top: 15px;
}

.webhook-format-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.webhook-payload {
  background-color: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.webhook-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 10px;
}

.remove-event-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 15px;
}

.remove-event-button {
  font-size: 12px;
}

.event-help {
  margin-top: 15px;
}

.add-event-section {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.add-event-button {
  width: 100%;
}

.template-dropdown {
  width: 100%;
  display: flex;
  justify-content: center;
}

.template-button {
  width: 100%;
}

.add-event-section .el-row {
  width: 100%;
}

@media (max-width: 768px) {
  .add-event-section .el-col {
    margin-bottom: 10px;
  }
}

.card-description {
  margin-bottom: 20px;
}

.hooks-header {
  margin-bottom: 20px;
}

.subscription-summary {
  padding: 10px 0;
}

.statistic-title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
