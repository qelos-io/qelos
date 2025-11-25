<template>
  <el-dialog
      v-model="dialogVisible"
      :title="$t('Add Component to Page')"
      width="80vw"
      height="50vh"
      modal-class="add-component-modal"
  >
    <el-steps style="width: 100%;" :active="active" finish-status="success">
      <el-step :title="$t('Component')"/>
      <el-step :title="$t('Properties')"/>
    </el-steps>
    <div class="content">
      <div v-if="active === 0" class="content">
        <h2 class="flex-0">{{ $t('Select Component') }}</h2>
        <div class="step-content components-list">
          <div v-for="(component, key) in availableComponents"
               :key="key"
               :style="{opacity: selectedComponent === key ? 1 : 0.7}"
               class="mock-component"
               @click="selectComponent(key)">
            <h3>{{ component.title }}</h3>
            <p v-if="component.description" class="component-description"><strong>{{ component.description }}</strong>
            </p>
            <component v-if="component.mock" :is="component.mock"></component>
          </div>
        </div>
      </div>
      <div v-else-if="active === 1" class="content">
        <h2 class="flex-0">{{ $t('Set Properties') }}</h2>
        <div class="step-content">
          <div v-for="prop in availableComponents[selectedComponent].requiredProps" :key="prop.prop">
            <h3 v-if="prop.type === 'array'">{{ prop.label }}</h3>
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
            <div v-else-if="prop.type === 'array'">
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
                  <RemoveButton @click="propsBuilder[prop.prop].splice(index, 1)"/>
                </div>
              </FormRowGroup>
              <AddMore @click="propsBuilder[prop.prop].push({})"/>
            </div>
            <FormInput v-else
                       :type="prop.type"
                       :title="prop.label"
                       :label="prop.description"
                       :placeholder="prop.placeholder"
                       :options="getPropOptions(prop)"
                       :select-options="prop.selectOptions"
                       v-model="propsBuilder[prop.prop]"/>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('Cancel') }}</el-button>
        <div>
          <el-button v-if="active > 0" type="primary" @click="active--">
            {{ $t('Back') }}
          </el-button>
          <el-button v-if="active === 1" type="primary" @click="submit">
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

const dialogVisible = ref(true)
const active = ref(0)
const selectedComponent = ref()
const propsBuilder = ref<any>({})
const cruds = toRef(usePluginsMicroFrontends(), 'cruds')
const blueprints = toRef(useBlueprintsStore(), 'blueprints');
const crudsOrBlueprints = ref('blueprints');
const integrationsStore = useIntegrationsStore();

const { availableComponents, getColumnsFromBlueprint } = useEditorComponents();

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

function selectComponent(key: string) {
  selectedComponent.value = key;
  propsBuilder.value = {
    data: '',
    columns: [{}],
  };

  propsBuilder.value = availableComponents.value[key].requiredProps.reduce((acc, prop) => {
    if (prop.source === 'requirements') {
      acc[prop.prop] = prop.value || '';
    } else if (prop.type === 'array') {
      acc[prop.prop] = [{}];
    } else {
      acc[prop.prop] = prop.value || '';
    }
    return acc;
  }, {});

  active.value++;
}

function refillColumnsFromBlueprint(blueprintId: string) {
  const columns = getColumnsFromBlueprint(blueprintId)
  if (columns) {
    propsBuilder.value.columns = columns;
  }
}

function submit() {
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
.step-content {
  overflow: auto;
}

.components-list {
  display: flex;
  flex-wrap: wrap;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
}

.remove-row {
  margin-bottom: 18px;
}

.mock-component {
  cursor: pointer;
  border: 1px solid #ccc;
  margin: 10px;
  padding: 10px;
  transition: background-color 0.2s ease;
  max-width: calc(66.7% - 20px);
  min-width: calc(33.3% - 20px);

  &:hover {
    background-color: #eee;
  }
}

.content {
  display: flex;
  overflow: auto;
  max-height: 100%;
  flex-direction: column;
}
</style>
<style>
.add-component-modal .el-dialog {
  overflow: auto;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.add-component-modal .el-dialog__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto
}
</style>