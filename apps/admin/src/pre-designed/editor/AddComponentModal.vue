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
      <div v-if="active === 0">
        <h2>{{ $t('Select Component') }}</h2>

        <div v-for="(component, key) in availableComponents"
             :key="key"
             :style="{opacity: selectedComponent === key ? 1 : 0.7}"
             class="mock-component"
             @click="selectComponent(key)">
          <component v-if="component.mock" :is="component.mock">{{ component.description }}</component>
        </div>

      </div>
      <div v-else-if="active === 1">
        <h2>{{ $t('Set Properties') }}}</h2>
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
            <FormRowGroup v-for="(col, index) in propsBuilder.columns" :key="index">
              <FormInput v-for="child in prop.children"
                         :class="child.type === 'switch' ? 'flex-0' : ''"
                         :key="child.prop"
                         :type="child.type"
                         :title="child.label"
                         v-model="col[child.prop]"
              />
              <div class="flex-0 remove-row">
                <RemoveButton @click="propsBuilder.columns.splice(index, 1)"/>
              </div>
            </FormRowGroup>
            <AddMore @click="propsBuilder.columns.push({})"/>
          </div>
          <FormInput v-else
                     :type="prop.type"
                     :title="prop.label"
                     :label="prop.description"
                     :placeholder="prop.placeholder"
                     v-model="propsBuilder[prop.prop]"/>
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
import { capitalize, provide, ref, toRef, watch } from 'vue'
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';

const dialogVisible = ref(true)
const active = ref(0)
const selectedComponent = ref()
const propsBuilder = ref<any>({})
const cruds = toRef(usePluginsMicroFrontends(), 'cruds')
const blueprints = toRef(useBlueprintsStore(), 'blueprints');
const crudsOrBlueprints = ref('blueprints');

const { availableComponents } = useEditorComponents();

const emit = defineEmits(['save', 'close'])

function selectComponent(key: string) {
  selectedComponent.value = key;
  propsBuilder.value = {
    data: '',
    columns: [{}]
  };

  propsBuilder.value = availableComponents[key].requiredProps.reduce((acc, prop) => {
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
  const blueprint = blueprints.value.find(b => b.identifier === blueprintId);
  if (blueprint) {
    propsBuilder.value.columns = Object.keys(blueprint.properties).map((propName: any) => {
      const prop = blueprint.properties[propName];
      return {
        prop: 'metadata.' + propName,
        label: prop.title,
        fixed: prop.type === 'boolean',
      }
    })
  }
}

function submit() {
  const descriptor = availableComponents[selectedComponent.value];
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

  emit('save', {
    component: descriptor.tag || selectedComponent.value,
    requirements: requiredProps
        .filter(prop => prop.source === 'requirements')
        .reduce((acc, prop) => {
          acc[propsBuilder.value[prop.prop]] = {
            key: propsBuilder.value[prop.prop],
            [crudsOrBlueprints.value === 'blueprints' ? 'fromBlueprint' : 'fromCrud']: {
              name: propsBuilder.value[prop.prop],
            }
          }
          return acc;
        }, customData),
    props,
    classes: availableComponents[selectedComponent.value].classes,
    innerHTML: availableComponents[selectedComponent.value].getInnerHTML?.(propsBuilder.value, props) || null
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
.dialog-footer {
  display: flex;
  justify-content: space-between;
}

.remove-row {
  margin-bottom: 18px;
}

.mock-component {
  cursor: pointer;
  border: 1px solid #eee;
  margin: 10px;
  padding: 10px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #eee;
  }
}

.content {
  overflow: auto;
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