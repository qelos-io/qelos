<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IBlueprint } from '@qelos/global-types';
import FilterableIntegrationsList from '@/modules/integrations/components/FilterableIntegrationsList.vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';

const props = defineProps<{ blueprint: Partial<IBlueprint> }>();

const router = useRouter();
const plugins = usePluginsList();
const integrations = useIntegrationsStore();

onMounted(() => {
  if (!plugins.loaded) plugins.retry();
  if (!integrations.loaded) integrations.retry();
});

const mapping = computed(() => Object.entries(props.blueprint.updateMapping || {}).map(([key, value]) => ({ key, value: String(value) })));
const propertyOptions = computed(() => Object.entries(props.blueprint.properties || {}).map(([key, property]) => ({ key, title: property.title || key })));
const freeKeys = computed(() => propertyOptions.value.filter((option) => !(option.key in (props.blueprint.updateMapping || {}))));

function writeMapping(entries: { key: string; value: string }[]) {
  props.blueprint.updateMapping = Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

function addCalculation() {
  const key = freeKeys.value[0]?.key ?? '';
  writeMapping([...mapping.value, { key, value: '' }]);
}

function setKey(index: number, key: string) {
  writeMapping(mapping.value.map((entry, i) => (i === index ? { ...entry, key } : entry)));
}

function setValue(index: number, value: string) {
  writeMapping(mapping.value.map((entry, i) => (i === index ? { ...entry, value } : entry)));
}

function removeCalculation(index: number) {
  writeMapping(mapping.value.filter((_, i) => i !== index));
}

const EVENTS = [
  { key: 'create', label: 'When an entity is created' },
  { key: 'update', label: 'When an entity is updated' },
  { key: 'delete', label: 'When an entity is deleted' },
] as const;

function setEvent(key: (typeof EVENTS)[number]['key'], value: boolean) {
  props.blueprint.dispatchers = { create: false, update: false, delete: false, ...props.blueprint.dispatchers, [key]: value };
}

const identifier = computed(() => props.blueprint.identifier || '');
const listeningPlugins = computed(() =>
  identifier.value
    ? plugins.plugins.filter((plugin) =>
        plugin.subscribedEvents?.some((event) => (event.source === 'blueprints' || event.source === '*') && (event.kind === identifier.value || event.kind === '*')),
      )
    : [],
);

function createIntegration() {
  router.push({ name: 'integrations', query: { mode: 'create', blueprintId: identifier.value, triggerSource: 'blueprints' } });
}
</script>

<template>
  <section aria-labelledby="auto-title">
    <header class="head">
      <h2 id="auto-title">{{ $t('Automation') }}</h2>
      <p class="lead" dir="auto">{{ $t('Work the platform does for you each time an entity is saved or changed.') }}</p>
    </header>

    <div class="block">
      <div class="block-head">
        <div>
          <h3>{{ $t('Calculated properties') }}</h3>
          <p class="sub" dir="auto">{{ $t('Fill a property with a jq calculation before each save. The entity is the input, so a value is .metadata.price.') }}</p>
        </div>
        <el-button text size="small" :disabled="!propertyOptions.length" @click="addCalculation">{{ $t('Add calculation') }}</el-button>
      </div>
      <ul v-if="mapping.length" class="calcs">
        <li v-for="(entry, index) in mapping" :key="index" class="calc">
          <el-select :model-value="entry.key" filterable :placeholder="$t('Property')" class="calc-key" @update:model-value="setKey(index, $event)">
            <el-option v-for="option in propertyOptions" :key="option.key" :label="option.title" :value="option.key" :disabled="option.key !== entry.key && option.key in (blueprint.updateMapping || {})" />
          </el-select>
          <span class="eq" aria-hidden="true">=</span>
          <el-input :model-value="entry.value" dir="ltr" class="mono calc-value" :placeholder="'.metadata.quantity * .metadata.price'" :aria-label="$t('jq calculation')" @update:model-value="setValue(index, $event)" />
          <el-button text circle :aria-label="$t('Remove calculation')" class="del" @click="removeCalculation(index)">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
          </el-button>
        </li>
      </ul>
      <p v-else class="none">{{ propertyOptions.length ? $t('No calculated properties.') : $t('Add a property first.') }}</p>
    </div>

    <div class="block">
      <div class="block-head">
        <div>
          <h3>{{ $t('Events') }}</h3>
          <p class="sub" dir="auto">{{ $t('Emit an event so plugins and integrations can react. Events are sent in the background and never slow the request down.') }}</p>
        </div>
      </div>
      <label v-for="event in EVENTS" :key="event.key" class="event-row">
        <el-switch :model-value="blueprint.dispatchers?.[event.key]" @update:model-value="setEvent(event.key, !!$event)" />
        <span>{{ $t(event.label) }}</span>
      </label>
    </div>

    <div v-if="identifier" class="block">
      <div class="block-head">
        <div>
          <h3>{{ $t('Listening') }}</h3>
          <p class="sub" dir="auto">{{ $t('Plugins and integrations that react to this blueprint.') }}</p>
        </div>
        <el-button text size="small" @click="createIntegration">{{ $t('New integration') }}</el-button>
      </div>
      <ul v-if="listeningPlugins.length" class="plugins">
        <li v-for="plugin in listeningPlugins" :key="plugin._id">
          <router-link :to="{ name: 'editPlugin', params: { pluginId: plugin._id } }">{{ plugin.name }}</router-link>
          <span>{{ $t('Plugin') }}</span>
        </li>
      </ul>
      <FilterableIntegrationsList
        :filter="{ triggerSource: 'blueprints', blueprintId: identifier }"
        compact
        @create="createIntegration"
        @edit="(id: string) => router.push({ name: 'integrations', query: { mode: 'edit', id } })"
      />
    </div>
  </section>
</template>

<style scoped>
.head {
  margin-block-end: 16px;
}

h2 {
  margin: 0;
  padding: 0;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: start;
}

h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.lead,
.sub {
  margin: 4px 0 0;
  max-inline-size: 62ch;
  color: var(--el-text-color-secondary);
}

.sub {
  font-size: 0.9rem;
}

.block + .block {
  margin-block-start: 28px;
}

.block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-block-end: 8px;
  margin-block-end: 10px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.none {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.calcs,
.plugins {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.calc {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calc-key {
  flex: 0 0 220px;
}

.calc-value {
  flex: 1;
  min-inline-size: 0;
}

.mono :deep(input) {
  font-family: var(--el-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

.eq {
  color: var(--el-text-color-secondary);
}

.del {
  color: var(--el-text-color-secondary);
}

.del:hover {
  color: var(--el-color-danger);
}

.event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block: 8px;
  cursor: pointer;
}

.plugins {
  margin-block-end: 12px;
}

.plugins li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.plugins span {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .calc {
    flex-wrap: wrap;
  }

  .calc-key,
  .calc-value {
    flex-basis: 100%;
  }

  .eq {
    display: none;
  }
}
</style>
