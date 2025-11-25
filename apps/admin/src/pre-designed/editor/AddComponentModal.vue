<template>
  <el-dialog
      v-model="dialogVisible"
      :title="$t('Add Component to Page')"
      top="2vh"
      width="90vw"
      height="90vh"
      center
      append-to-body
      modal-class="add-component-modal"
  >
    <el-steps style="width: 100%;" :active="active" finish-status="success">
      <el-step :title="$t('Component')"/>
      <el-step :title="$t('Properties')"/>
    </el-steps>
    <div class="content">
      <div v-if="active === 0" class="selection-layout">
        <aside class="selection-layout__filters">
          <el-input
              v-model="searchQuery"
              :prefix-icon="Search"
              :placeholder="$t('Search components')"
              clearable
          />
          <section class="filters-group">
            <span class="filters-group__title">{{ $t('Categories') }}</span>
            <el-radio-group v-model="categoryFilter" class="filters-group__chips">
              <el-radio-button
                  v-for="option in categoryOptions"
                  :key="option"
                  :label="option"
              >
                {{ option === 'all' ? $t('All') : capitalize(option) }}
              </el-radio-button>
            </el-radio-group>
          </section>
          <section class="filters-group" v-if="capabilityOptions.length">
            <span class="filters-group__title">{{ $t('Capabilities') }}</span>
            <el-checkbox-group v-model="capabilityFilter" class="filters-group__chips">
              <el-checkbox-button
                  v-for="option in capabilityOptions"
                  :key="option"
                  :label="option"
              >
                {{ capitalize(option) }}
              </el-checkbox-button>
            </el-checkbox-group>
          </section>
          <section class="filters-group" v-if="favoriteComponents.length">
            <span class="filters-group__title">{{ $t('Favorites') }}</span>
            <el-tag
                v-for="fav in favoriteComponents"
                :key="fav.key"
                size="small"
                type="warning"
                class="favorite-tag"
                @click="selectComponent(fav.key)"
            >
              {{ fav.descriptor.title }}
            </el-tag>
          </section>
        </aside>
        <section class="selection-layout__list">
          <div v-if="!displayedComponents.length" class="empty-state">
            <p>{{ $t('No components match your filters.') }}</p>
            <el-button text @click="resetFilters">{{ $t('Reset filters') }}</el-button>
          </div>
          <div v-else class="components-grid">
            <article
                v-for="entry in displayedComponents"
                :key="entry.key"
                :class="['component-card', { 'component-card--active': entry.key === selectedComponent }]"
                @click="selectComponent(entry.key)"
            >
              <div class="component-card__header">
                <div class="component-card__title">
                  <span class="component-card__badge">
                    {{ entry.descriptor.category ? capitalize(entry.descriptor.category) : $t('Custom') }}
                  </span>
                  <h3>{{ entry.descriptor.title }}</h3>
                </div>
                <el-button
                    text
                    circle
                    size="small"
                    :icon="isFavorite(entry.key) ? StarFilled : Star"
                    @click.stop="toggleFavorite(entry.key)"
                />
              </div>
              <p class="component-card__description">
                {{ entry.descriptor.description || $t('No description provided yet.') }}
              </p>
              <div class="component-card__tags">
                <el-tag
                    v-for="tag in entry.descriptor.tags || []"
                    :key="tag"
                    size="small"
                >
                  {{ tag }}
                </el-tag>
              </div>
              <div class="component-card__meta">
                <span>{{ $t('{count} required props', { count: entry.descriptor.requiredProps.length }) }}</span>
                <span v-if="entry.descriptor.capabilities?.length">
                  {{ entry.descriptor.capabilities.join(', ') }}
                </span>
              </div>
            </article>
          </div>
        </section>
        <section class="selection-layout__details" v-if="selectedComponentInfo">
          <div class="details-card">
            <div class="details-card__header">
              <h3>{{ selectedComponentInfo.title }}</h3>
              <el-tag size="small" type="info">
                {{ selectedComponentInfo.category ? capitalize(selectedComponentInfo.category) : $t('Custom') }}
              </el-tag>
            </div>
            <p class="details-card__description">{{ selectedComponentInfo.description }}</p>
            <div class="details-card__preview">
              <component v-if="selectedComponentInfo.mock" :is="selectedComponentInfo.mock" />
              <div v-else class="details-card__preview--placeholder">
                {{ $t('Preview unavailable') }}
              </div>
            </div>
            <div class="details-card__badges">
              <el-tag
                  v-for="cap in selectedComponentInfo.capabilities || []"
                  :key="cap"
                  size="small"
                  type="success"
              >
                {{ capitalize(cap) }}
              </el-tag>
            </div>
            <el-link
                v-if="selectedComponentInfo.docUrl"
                :href="selectedComponentInfo.docUrl"
                target="_blank"
                class="doc-link"
                :icon="Link"
            >
              {{ $t('Open documentation') }}
            </el-link>
          </div>
        </section>
      </div>
      <div v-else-if="active === 1" class="properties-layout">
        <div v-if="selectedComponentInfo" class="properties-layout__grid">
          <section class="properties-layout__form">
            <div v-for="group in groupedProps" :key="group.key" class="prop-group">
              <div class="prop-group__header">
                <h3>{{ group.title }}</h3>
                <p v-if="group.description">{{ group.description }}</p>
              </div>
              <div class="prop-group__fields">
                <template v-for="prop in group.props" :key="prop.prop">
                  <FormRowGroup v-if="prop.source === 'requirements'">
                    <el-form-item class="flex-0">
                      <el-switch
                          v-model="crudsOrBlueprints"
                          inactive-value="cruds"
                          active-value="blueprints"
                          :inactive-text="$t('Resources')"
                          :active-text="$t('Blueprints')"/>
                    </el-form-item>
                    <el-form-item v-if="crudsOrBlueprints === 'cruds'" :label="$t('Choose Resource')">
                      <el-select v-model="propsBuilder[prop.prop]" :placeholder="$t('Select')">
                        <el-option
                            v-for="(crud, key) in cruds"
                            :key="key"
                            :label="capitalize(key)"
                            :value="key"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item v-else :label="$t('Choose Blueprint')">
                      <el-select v-model="propsBuilder[prop.prop]"
                                 @change="refillColumnsFromBlueprint(propsBuilder[prop.prop])"
                                 :placeholder="$t('Select')">
                        <el-option
                            v-for="blueprint in blueprints"
                            :key="blueprint.identifier"
                            :label="blueprint.name"
                            :value="blueprint.identifier"
                        />
                      </el-select>
                    </el-form-item>
                  </FormRowGroup>
                  <FormRowGroup v-else-if="prop.source === 'blueprint'">
                    <el-form-item :label="$t('Choose Blueprint')">
                      <el-select v-model="propsBuilder[prop.prop]" :placeholder="$t('Select')">
                        <el-option
                            v-for="blueprint in blueprints"
                            :key="blueprint.identifier"
                            :label="blueprint.name"
                            :value="blueprint.identifier"
                        />
                      </el-select>
                    </el-form-item>
                  </FormRowGroup>
                  <div v-else-if="prop.type === 'array'" class="array-prop">
                    <FormRowGroup v-for="(col, index) in propsBuilder[prop.prop]" :key="index">
                      <FormInput v-for="child in prop.children"
                                 :class="child.type === 'switch' ? 'flex-0' : ''"
                                 :key="child.prop"
                                 :type="child.type"
                                 :title="child.label"
                                 :options="getPropOptions(child)"
                                 :select-options="child.selectOptions"
                                 v-model="col[child.prop]"
                      />
                      <div class="flex-0 remove-row">
                        <RemoveButton @click="removeArrayRow(prop.prop, index)"/>
                      </div>
                    </FormRowGroup>
                    <AddMore @click="addArrayRow(prop.prop)"/>
                  </div>
                  <FormInput v-else
                             :type="prop.type"
                             :title="prop.label"
                             :label="prop.description"
                             :placeholder="prop.placeholder"
                             :options="getPropOptions(prop)"
                             :select-options="prop.selectOptions"
                             v-model="propsBuilder[prop.prop]"/>
                </template>
              </div>
            </div>
          </section>
          <section class="properties-layout__summary">
            <div class="summary-card">
              <h3>{{ $t('Configuration summary') }}</h3>
              <el-descriptions v-if="bindingPreview.length" :column="1" border>
                <el-descriptions-item
                    v-for="item in bindingPreview"
                    :key="item.label"
                    :label="item.label"
                >
                  <div class="summary-item">
                    <span>{{ item.value }}</span>
                    <el-tag size="small" type="info">{{ item.source }}</el-tag>
                  </div>
                </el-descriptions-item>
              </el-descriptions>
              <p v-else class="summary-empty">{{ $t('Start setting properties to see the summary.') }}</p>
              <div class="summary-flags" v-if="integrationHighlights">
                <el-alert
                    v-if="integrationHighlights.requiresData"
                    type="info"
                    :closable="false"
                    :title="$t('Requires data binding from Resources or Blueprints')"
                />
                <el-alert
                    v-if="integrationHighlights.requiresBlueprint"
                    type="warning"
                    :closable="false"
                    :title="$t('Requires blueprint selection to generate schema columns')"
                />
                <el-alert
                    v-if="integrationHighlights.hasAi"
                    type="success"
                    :closable="false"
                    :title="$t('Supports AI integrations and chat endpoints')"
                />
              </div>
              <el-link
                  v-if="selectedComponentInfo.docUrl"
                  :href="selectedComponentInfo.docUrl"
                  target="_blank"
                  class="doc-link"
                  :icon="Link"
              >
                {{ $t('Review documentation') }}
              </el-link>
            </div>
          </section>
        </div>
        <div v-else class="empty-state">
          <p>{{ $t('Select a component to configure its properties.') }}</p>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('Cancel') }}</el-button>
        <div>
          <el-button v-if="active > 0" @click="goBack">
            {{ $t('Back') }}
          </el-button>
          <el-button
              v-if="active === 0"
              type="primary"
              :disabled="!selectedComponent"
              @click="goToProperties"
          >
            {{ $t('Next') }}
          </el-button>
          <el-button v-else type="primary" @click="submit">
            {{ $t('Confirm') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { capitalize, computed, provide, ref, toRef, watch } from 'vue'
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useI18n } from 'vue-i18n';
import { Search, Star, StarFilled, Link } from '@element-plus/icons-vue';

const FAVORITES_STORAGE_KEY = 'qelos:add-component:favorites';

const dialogVisible = ref(true)
const active = ref(0)
const selectedComponent = ref<string>()
const propsBuilder = ref<Record<string, any>>({})
const cruds = toRef(usePluginsMicroFrontends(), 'cruds')
const blueprints = toRef(useBlueprintsStore(), 'blueprints');
const crudsOrBlueprints = ref<'cruds' | 'blueprints'>('blueprints');
const integrationsStore = useIntegrationsStore();
const { t } = useI18n();

const searchQuery = ref('');
const categoryFilter = ref<'all' | string>('all');
const capabilityFilter = ref<string[]>([]);
const favoriteKeys = ref<string[]>([]);

const { availableComponents, getColumnsFromBlueprint } = useEditorComponents();

if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      favoriteKeys.value = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load favorite components', error);
  }
}

watch(favoriteKeys, value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(value));
  }
}, { deep: true });

const componentEntries = computed(() => Object.entries(availableComponents.value).map(([key, descriptor]) => ({ key, descriptor })));

const categoryOptions = computed(() => {
  const categories = new Set<string>();
  componentEntries.value.forEach(entry => {
    if (entry.descriptor.category) {
      categories.add(entry.descriptor.category);
    }
  });
  return ['all', ...Array.from(categories)];
});

const capabilityOptions = computed(() => {
  const caps = new Set<string>();
  componentEntries.value.forEach(entry => {
    (entry.descriptor.capabilities || []).forEach(cap => caps.add(cap));
  });
  return Array.from(caps);
});

const favoriteComponents = computed(() => componentEntries.value.filter(entry => favoriteKeys.value.includes(entry.key)));

const displayedComponents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const filtered = componentEntries.value.filter(entry => {
    const matchesSearch = !query || [
      entry.descriptor.title,
      entry.descriptor.description,
      ...(entry.descriptor.tags || [])
    ].some(field => field?.toLowerCase().includes(query));
    const matchesCategory = categoryFilter.value === 'all' || entry.descriptor.category === categoryFilter.value;
    const matchesCapabilities = !capabilityFilter.value.length || capabilityFilter.value.every(cap => entry.descriptor.capabilities?.includes(cap));
    return matchesSearch && matchesCategory && matchesCapabilities;
  });
  return filtered.sort((a, b) => {
    const aFav = favoriteKeys.value.includes(a.key) ? 1 : 0;
    const bFav = favoriteKeys.value.includes(b.key) ? 1 : 0;
    if (aFav !== bFav) {
      return bFav - aFav;
    }
    return (a.descriptor.title || '').localeCompare(b.descriptor.title || '');
  });
});

const selectedComponentInfo = computed(() => selectedComponent.value ? availableComponents.value[selectedComponent.value] : undefined);

const groupedProps = computed(() => {
  if (!selectedComponentInfo.value) {
    return [];
  }
  const groups = new Map<string, { key: string, title: string, description?: string, props: any[] }>();
  const ensureGroup = (key: string, title: string, description?: string) => {
    if (!groups.has(key)) {
      groups.set(key, { key, title, description, props: [] });
    }
    return groups.get(key)!;
  };

  selectedComponentInfo.value.requiredProps.forEach(prop => {
    if (prop.source === 'requirements') {
      ensureGroup('data', t('Connect data sources'), t('Bind to resources or blueprints.')).props.push(prop);
    } else if (prop.source === 'blueprint') {
      ensureGroup('blueprint', t('Blueprint context'), t('Configure schema-aware behavior.')).props.push(prop);
    } else {
      ensureGroup('configuration', t('Display & behavior')).props.push(prop);
    }
  });

  return Array.from(groups.values()).filter(group => group.props.length);
});

const bindingPreview = computed(() => {
  if (!selectedComponentInfo.value) {
    return [];
  }
  return selectedComponentInfo.value.requiredProps
    .map(prop => {
      const value = propsBuilder.value[prop.prop];
      if (!value || (Array.isArray(value) && !value.length)) {
        return null;
      }
      let previewValue = value;
      if (Array.isArray(value)) {
        previewValue = `${value.length} ${t('entries')}`;
      } else if (typeof value === 'object') {
        previewValue = t('Custom object');
      }
      return {
        label: prop.label || prop.prop,
        value: previewValue,
        source: prop.source === 'requirements' ? t('Resource') : prop.source === 'blueprint' ? t('Blueprint') : t('Manual')
      };
    })
    .filter((item): item is { label: string, value: string, source: string } => Boolean(item));
});

const integrationHighlights = computed(() => {
  if (!selectedComponentInfo.value) {
    return null;
  }
  const requiredProps = selectedComponentInfo.value.requiredProps || [];
  return {
    requiresData: requiredProps.some(prop => prop.source === 'requirements'),
    requiresBlueprint: requiredProps.some(prop => prop.source === 'blueprint'),
    hasAi: selectedComponentInfo.value.capabilities?.includes('ai') || requiredProps.some(prop => prop.optionsResolver === 'aiChatUrls')
  };
});

function resetFilters() {
  searchQuery.value = '';
  categoryFilter.value = 'all';
  capabilityFilter.value = [];
}

function isFavorite(key: string) {
  return favoriteKeys.value.includes(key);
}

function toggleFavorite(key: string) {
  if (isFavorite(key)) {
    favoriteKeys.value = favoriteKeys.value.filter(item => item !== key);
  } else {
    favoriteKeys.value = [...favoriteKeys.value, key];
  }
}

const aiChatUrlOptions = computed(() => {
  const integrations = integrationsStore.integrations || [];
  return integrations
    .filter((integration: any) => integration?.trigger?.operation === 'chatCompletion')
    .map((integration: any) => {
      const integrationId = integration?._id;
      if (!integrationId) return null;
      const baseUrl = `/api/ai/${integrationId}/chat-completion`;
      const shouldRecord = Boolean(integration?.trigger?.details?.recordThread);
      const url = shouldRecord ? `${baseUrl}/[threadId]` : baseUrl;
      const name = integration?.trigger?.details?.name || integration?.name || integrationId;
      return {
        identifier: url,
        name: `${name} (${url})`
      };
    })
    .filter((option): option is { identifier: string, name: string } => Boolean(option));
});

const fontAwesomeIconOptions = [
  { identifier: 'robot', name: '🤖 Robot (fa-robot)' },
  { identifier: 'user-astronaut', name: '👩‍🚀 Astronaut (fa-user-astronaut)' },
  { identifier: 'comments', name: '💬 Comments (fa-comments)' },
  { identifier: 'lightbulb', name: '💡 Lightbulb (fa-lightbulb)' },
  { identifier: 'bolt', name: '⚡ Bolt (fa-bolt)' },
  { identifier: 'brain', name: '🧠 Brain (fa-brain)' },
  { identifier: 'gear', name: '⚙️ Gear (fa-gear)' },
  { identifier: 'question-circle', name: '❓ Question (fa-question-circle)' },
  { identifier: 'hands-helping', name: '🤝 Help (fa-hands-helping)' },
  { identifier: 'wand-magic-sparkles', name: '✨ Magic (fa-wand-magic-sparkles)' },
  { identifier: 'headset', name: '🎧 Support (fa-headset)' },
  { identifier: 'rocket', name: '🚀 Rocket (fa-rocket)' },
  { identifier: 'chart-line', name: '📈 Insights (fa-chart-line)' },
  { identifier: 'shield-check', name: '🛡️ Secure (fa-shield-check)' },
  { identifier: 'circle-info', name: 'ℹ️ Info (fa-circle-info)' },
  { identifier: 'flag-checkered', name: '🏁 Goals (fa-flag-checkered)' },
  { identifier: 'paper-plane', name: '🛫 Launch (fa-paper-plane)' },
  { identifier: 'puzzle-piece', name: '🧩 Puzzle (fa-puzzle-piece)' },
  { identifier: 'clipboard-list', name: '📋 Tasks (fa-clipboard-list)' },
  { identifier: 'star', name: '⭐ Favorite (fa-star)' }
];

const optionResolvers: Record<string, () => Array<{ identifier: string, name: string }>> = {
  aiChatUrls: () => aiChatUrlOptions.value,
  faIcons: () => fontAwesomeIconOptions,
};

const getPropOptions = (prop: any) => {
  if (prop?.optionsResolver && optionResolvers[prop.optionsResolver]) {
    return optionResolvers[prop.optionsResolver]() || [];
  }
  return prop?.options || [];
};

const emit = defineEmits(['save', 'close'])

function initializePropsBuilder(key: string) {
  const descriptor = availableComponents.value[key];
  propsBuilder.value = descriptor.requiredProps.reduce((acc, prop) => {
    if (prop.source === 'requirements') {
      acc[prop.prop] = prop.value || '';
    } else if (prop.type === 'array') {
      acc[prop.prop] = prop.value || [{}];
    } else {
      acc[prop.prop] = prop.value ?? '';
    }
    return acc;
  }, {} as Record<string, any>);
}

function selectComponent(key: string) {
  selectedComponent.value = key;
  initializePropsBuilder(key);
}

function refillColumnsFromBlueprint(blueprintId: string) {
  const columns = getColumnsFromBlueprint(blueprintId)
  if (columns) {
    propsBuilder.value.columns = columns;
  }
}

function addArrayRow(propKey: string) {
  if (!Array.isArray(propsBuilder.value[propKey])) {
    propsBuilder.value[propKey] = [];
  }
  propsBuilder.value[propKey].push({});
}

function removeArrayRow(propKey: string, index: number) {
  if (Array.isArray(propsBuilder.value[propKey])) {
    propsBuilder.value[propKey].splice(index, 1);
  }
}

function goToProperties() {
  if (selectedComponent.value) {
    active.value = 1;
  }
}

function goBack() {
  active.value = Math.max(0, active.value - 1);
}

function submit() {
  if (!selectedComponent.value) {
    return;
  }
  const descriptor = availableComponents.value[selectedComponent.value];
  const requiredProps = descriptor.requiredProps;
  const props = {}
  const customData = {};
  for (const propName in propsBuilder.value) {
    const propData = requiredProps.find(p => p.prop === propName);
    if (!propData) {
      continue;
    }
    const val = propData.valueBuilder ? propData.valueBuilder(propsBuilder.value[propName]) : propsBuilder.value[propName];
    if (!val) continue;
    if (typeof val == 'object') {
      const keyName = propName + '_' + Date.now().toString().substring(0, 5);
      customData[keyName] = {
        key: keyName,
        fromData: val
      }
      props['v-bind:' + propName] = keyName;
    } else if (propData.source === 'requirements') {
      props['v-bind:' + propName] = val + '?.result'
    } else {
      props[propData.bind ? ('v-bind:' + propName) : propName] = val;
    }
  }

  descriptor.extendProps?.(props);
  descriptor.extendRequirements?.(customData, props);
  const requirements = requiredProps
      .filter(prop => prop.source === 'requirements')
      .reduce((acc, prop) => {
        acc[propsBuilder.value[prop.prop]] = {
          key: propsBuilder.value[prop.prop],
          [crudsOrBlueprints.value === 'blueprints' ? 'fromBlueprint' : 'fromCrud']: {
            name: propsBuilder.value[prop.prop],
          }
        }
        return acc;
      }, customData);
  emit('save', {
    component: descriptor.tag || selectedComponent.value,
    requirements,
    props,
    classes: availableComponents.value[selectedComponent.value].classes,
    innerHTML: availableComponents.value[selectedComponent.value].getInnerHTML?.(propsBuilder.value, props, requirements) || null
  });
  dialogVisible.value = false;
}

watch(dialogVisible, isOpen => {
  if (!isOpen) {
    emit('close');
  }
})

provide('editableManager', ref(false))
</script>
<style scoped>
.content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  block-size: 100%;
  gap: 1.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  inline-size: 100%;
  gap: 1rem;
}

.selection-layout {
  display: grid;
  grid-template-columns: 18rem 1fr 22rem;
  gap: 1.5rem;
  block-size: 100%;
}

.selection-layout__filters,
.selection-layout__list,
.selection-layout__details {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
  padding-inline: 1rem;
  padding-block: 1.25rem;
  overflow: auto;
}

.filters-group {
  margin-block-start: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filters-group__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.filters-group__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.favorite-tag {
  cursor: pointer;
  margin-inline-end: 0.5rem;
  margin-block-end: 0.5rem;
}

.selection-layout__list {
  display: flex;
  flex-direction: column;
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1rem;
  overflow: auto;
}

.component-card {
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.component-card--active,
.component-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 25%, transparent);
}

.component-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.component-card__badge {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.component-card__description {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.component-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.component-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--el-text-color-placeholder);
}

.details-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  block-size: 100%;
}

.details-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.details-card__description {
  color: var(--el-text-color-secondary);
}

.details-card__preview {
  min-block-size: 12rem;
  border: 1px dashed var(--el-border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.details-card__preview--placeholder {
  color: var(--el-text-color-placeholder);
}

.details-card__badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.properties-layout {
  display: flex;
  flex-direction: column;
  block-size: 100%;
}

.properties-layout__grid {
  display: grid;
  grid-template-columns: 3fr 1.4fr;
  gap: 1.5rem;
  block-size: 100%;
}

.properties-layout__form,
.properties-layout__summary {
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  overflow: auto;
}

.prop-group {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-block: 1rem;
}

.prop-group:last-of-type {
  border-bottom: none;
}

.prop-group__header {
  margin-block-end: 0.75rem;
}

.prop-group__header h3 {
  margin: 0;
}

.prop-group__header p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.prop-group__fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.array-prop {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.remove-row {
  margin-block-end: 1rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.summary-empty {
  color: var(--el-text-color-secondary);
  margin: 0;
}

.summary-flags {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1200px) {
  .selection-layout {
    grid-template-columns: 1fr;
  }

  .properties-layout__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .selection-layout__filters,
  .selection-layout__list,
  .selection-layout__details {
    padding-inline: 0.75rem;
    padding-block: 1rem;
  }

  .components-grid {
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  }
}
</style>
<style>
.add-component-modal .el-dialog {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 95vh;
}

.add-component-modal .el-dialog__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}
</style>