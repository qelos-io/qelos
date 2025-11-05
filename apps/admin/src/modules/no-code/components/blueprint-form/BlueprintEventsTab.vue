<script setup lang="ts">
import { ref, inject, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import FilterableIntegrationsList from '@/modules/integrations/components/FilterableIntegrationsList.vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';

// Define the model for the dispatchers
const dispatchers = defineModel<{
  create: boolean;
  update: boolean;
  delete: boolean;
}>();

const edit = inject('edit', {}) as any;

// Get plugins list store
const pluginsStore = usePluginsList();

// Get integrations store
const integrationsStore = useIntegrationsStore();

// Get router for navigation
const router = useRouter();

// Get the blueprint identifier
const blueprintIdentifier = computed(() => edit.identifier || '');
// Filter plugins that are subscribed to this blueprint's events
const subscribedPlugins = computed(() => {
  if (!blueprintIdentifier.value) return [];
  return pluginsStore.plugins.filter(plugin => {
    return plugin.subscribedEvents?.some(event => {
      // Check if the plugin is subscribed to any event from this blueprint
      return (
        (event.source === 'blueprints' || event.source === '*') && 
        (event.kind === blueprintIdentifier.value || event.kind === '*')
      );
    });
  });
});

// Create a new integration with this blueprint as trigger
function createIntegrationWithBlueprint() {
  router.push({
    name: 'integrations',
    query: { 
      mode: 'create',
      blueprintId: blueprintIdentifier.value,
      triggerSource: 'blueprints'
    }
  });
}

// Load plugins and integrations on component mount
onMounted(() => {
  if (!pluginsStore.loaded) {
    pluginsStore.retry();
  }
  
  if (!integrationsStore.loaded) {
    integrationsStore.retry();
  }
});
</script>

<template>
  <div class="events-tab-container">
    <div class="events-section">
      <h3>{{ $t('Event Dispatchers') }}</h3>
      <p class="section-description">
        {{ $t('Enable event dispatching for entity operations. These events can be used to trigger webhooks or other integrations.') }}
        <InfoIcon :content="$t('Events are emitted asynchronously and do not affect the operation\'s response time.')" />
      </p>
      
      <div class="event-types-container">
        <FormRowGroup align-start>
          <FormInput 
            v-model="dispatchers.create" 
            title="Create" 
            type="switch" 
            class="flex-0"
            :description="$t('Emit events when entities are created')"
          />
          <FormInput 
            v-model="dispatchers.update" 
            title="Update" 
            type="switch" 
            class="flex-0"
            :description="$t('Emit events when entities are updated')"
          />
          <FormInput 
            v-model="dispatchers.delete" 
            title="Delete" 
            type="switch" 
            class="flex-0"
            :description="$t('Emit events when entities are deleted')"
          />
        </FormRowGroup>
      </div>

      <!-- Subscribed Plugins Section -->
      <div v-if="blueprintIdentifier" class="subscribed-plugins-section">
        <h3>{{ $t('Subscribed Plugins') }}</h3>
        <p class="section-description">
          {{ $t('Plugins that are subscribed to events from this blueprint.') }}
          <InfoIcon :content="$t('These plugins will receive events when the corresponding operations are performed on entities of this blueprint.')" />
        </p>

        <div v-if="pluginsStore.loading" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="subscribedPlugins.length === 0" class="compact-empty-state">
          <el-icon><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
          <span>{{ $t('No plugins are currently subscribed to events from this blueprint') }}</span>
        </div>
        
        <div v-else class="plugins-list">
          <router-link 
            v-for="plugin in subscribedPlugins" 
            :key="plugin._id" 
            :to="{ name: 'editPlugin', params: { pluginId: plugin._id } }"
            class="plugin-link"
          >
            <el-card 
              class="plugin-card"
              shadow="hover"
            >
            <template #header>
              <div class="plugin-header">
                <h4>{{ plugin.name }}</h4>
                <el-tooltip :content="$t('Edit Plugin')" placement="top">
                  <el-icon class="edit-icon"><font-awesome-icon :icon="['fas', 'edit']" /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div class="plugin-content">
              <p v-if="plugin.description">{{ plugin.description }}</p>
              
              <div class="subscribed-events">
                <h5>{{ $t('Subscribed Events') }}</h5>
                <ul>
                  <li v-for="(event, index) in plugin.subscribedEvents.filter(e => 
                    (e.source === 'blueprints' || e.source === '*') && 
                    (e.kind === blueprintIdentifier || e.kind === '*')
                  )" :key="index">
                    <strong>{{ event.source || '*' }} / {{ event.kind || '*' }} / {{ event.eventName || '*' }}</strong>
                    <span class="event-hook">{{ $t('Webhook') }}: {{ event.hookUrl }}</span>
                  </li>
                </ul>
              </div>
            </div>
            </el-card>
          </router-link>
        </div>
      </div>
      
      <!-- Related Integrations Section -->
      <div v-if="blueprintIdentifier" class="related-integrations-section">
        <div class="section-header">
          <h3>{{ $t('Related Integrations') }}</h3>
          <el-button 
            type="primary" 
            size="small" 
            @click="createIntegrationWithBlueprint"
          >
            <el-icon><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
            {{ $t('Create Integration') }}
          </el-button>
        </div>
        <p class="section-description">
          {{ $t('Integrations that are triggered by events from this blueprint.') }}
          <InfoIcon :content="$t('These integrations will be triggered when the corresponding operations are performed on entities of this blueprint.')" />
        </p>

        <div class="integrations-container">
          <FilterableIntegrationsList 
            :filter="{
              triggerSource: 'blueprints',
              blueprintId: blueprintIdentifier
            }"
            compact
            @create="createIntegrationWithBlueprint"
            @edit="(id) => router.push({ name: 'integrations', query: { mode: 'edit', id } })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.events-tab-container {
  width: 100%;
}

.events-section {
  margin-bottom: 2rem;
}

.section-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

h4 {
  margin: 0;
  font-weight: 600;
  color: var(--el-color-primary);
}

h5 {
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.plugins-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.plugin-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.plugin-card {
  transition: all 0.3s ease;
  height: 100%;
}

.plugin-link:hover .plugin-card {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-5);
}

.plugin-link:active .plugin-card {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.plugin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-icon {
  color: var(--el-color-primary);
  font-size: 1rem;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.plugin-link:hover .edit-icon {
  opacity: 1;
  transform: scale(1.1);
}

.plugin-content {
  font-size: 0.9rem;
}

.subscribed-events ul {
  list-style: none;
  padding-inline-start: 0.5rem;
  margin: 0.5rem 0;
}

.subscribed-events li {
  margin-block-end: 0.5rem;
  padding: 0.5rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.event-hook {
  display: block;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  margin-block-start: 0.25rem;
  word-break: break-all;
}

.empty-state {
  padding: 2rem 0;
}

.compact-empty-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  margin-block-end: 1.5rem;
}

.compact-empty-state .el-icon {
  color: var(--el-color-info);
  font-size: 1rem;
}

.loading-state {
  padding: 1rem 0;
}

.subscribed-plugins-section,
.related-integrations-section {
  margin-block-start: 2rem;
  padding-block-start: 1.5rem;
  border-top: 1px solid var(--el-border-color-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 1rem;
}

.integrations-container {
  margin-block-start: 1.5rem;
}

.trigger-details {
  background-color: var(--el-fill-color-light);
  padding: 0.75rem;
  border-radius: 4px;
  margin-block-start: 0.5rem;
}

.trigger-source,
.trigger-operation,
.trigger-kind > div {
  margin-block-end: 0.5rem;
}

.trigger-description {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
  margin-block-start: 0.5rem;
  line-height: 1.4;
}

.integrations-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.integration-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.integration-card {
  transition: all 0.3s ease;
  height: 100%;
}

.integration-link:hover .integration-card {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-5);
}

.integration-link:active .integration-card {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.integration-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.integration-content {
  font-size: 0.9rem;
}

.integration-triggers ul {
  list-style: none;
  padding-inline-start: 0.5rem;
  margin: 0.5rem 0;
}

.integration-triggers li {
  margin-block-end: 0.5rem;
  padding: 0.5rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
