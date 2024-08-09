<template>
  <el-dialog
      v-model="dialogVisible"
      title="Tips"
      width="80vw"
  >
    <el-steps style="width: 100%;" :active="active" finish-status="success">
      <el-step title="Component"/>
      <el-step title="Properties"/>
    </el-steps>
    <div v-if="active === 0">
      <h2>Select Component</h2>

      <div v-for="(component, key) in availableComponents"
           :key="key"
           :style="{opacity: selectedComponent === key ? 1 : 0.7}"
           class="mock-component"
           @click="selectComponent(key)">
        <component v-if="component.mock" :is="component.mock">{{ component.description }}</component>
      </div>

    </div>
    <div v-else-if="active === 1">
      <h2>Set Properties</h2>
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
          <el-form-item v-if="crudsOrBlueprints === 'cruds'" label="Choose Resource">
            <el-select v-model="propsBuilder[prop.prop]" placeholder="Select">
              <el-option
                  v-for="(crud, key) in cruds"
                  :key="key"
                  :label="capitalize(key)"
                  :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-else label="Choose Blueprint">
            <el-select v-model="propsBuilder[prop.prop]"
                       @change="refillColumnsFromBlueprint(propsBuilder[prop.prop])"
                       placeholder="Select">
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
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <div>
          <el-button v-if="active > 0" type="primary" @click="active--">
            Back
          </el-button>
          <el-button v-if="active === 1" type="primary" @click="submit">
            Confirm
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { capitalize, provide, ref, toRef, watch } from 'vue'
import MockTable from '@/pre-designed/editor/MockTable.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import MockListPageTitle from '@/pre-designed/editor/MockListPageTitle.vue';
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';

const dialogVisible = ref(true)
const active = ref(0)
const selectedComponent = ref()
const propsBuilder = ref<any>({})
const cruds = toRef(usePluginsMicroFrontends(), 'cruds')
const blueprints = toRef(useBlueprintsStore(), 'blueprints');
const crudsOrBlueprints = ref('blueprints');

const availableComponents = {
  'list-page-title': {
    component: ListPageTitle,
    mock: MockListPageTitle,
    requiredProps: [
      { prop: 'title', label: 'Title', type: 'text', source: 'manual' },
      { prop: 'create-route-path', label: 'Path to Create New Item', type: 'text', source: 'manual' },
    ]
  },
  'quick-table': {
    component: QuickTable,
    mock: MockTable,
    requiredProps: [
      { prop: 'data', label: 'Data', type: 'array', source: 'requirements' },
      {
        prop: 'columns', label: 'Columns', type: 'array', source: 'manual',
        children: [
          { prop: 'prop', label: 'Property', type: 'text' },
          { prop: 'label', label: 'Label', type: 'text' },
          { prop: 'width', label: 'Width', type: 'text' },
          { prop: 'minWidth', label: 'Min Width', type: 'text' },
          { prop: 'fixed', label: 'Fixed', type: 'switch' },
        ]
      }
    ]
  },
  'general-form': {
    component: GeneralForm,
    mock: 'h2',
    description: 'Choose this box to create a form',
    requiredProps: [
      {
        prop: 'on-submit',
        label: 'On Submit',
        type: 'text',
        source: 'manual',
        bind: true,
        value: '(form) => sdk.blueprints.entitiesOf(\'todo\').create(form)',
        description: 'Function to call when form is submitted'
      },
      {
        prop: 'data', label: 'Data', type: 'text', source: 'manual',
        bind: true,
        description: 'Data to be used in the form'
      },
      {
        props: 'submit-msg',
        type: 'text',
        label: 'Success Message',
        placeholder: 'Submitted successfully',
        source: 'manual'
      },
      {
        props: 'error-msg',
        type: 'text',
        label: 'Error Message',
        placeholder: 'Failed to submit entity',
        source: 'manual'
      }
    ]
  }
}

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
  const requiredProps = availableComponents[selectedComponent.value].requiredProps;
  const props = {}
  const customData = {};
  for (const propName in propsBuilder.value) {
    const propData = requiredProps.find(p => p.prop === propName);
    const val = propsBuilder.value[propName];
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

  emit('save', {
    component: selectedComponent.value,
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
</style>