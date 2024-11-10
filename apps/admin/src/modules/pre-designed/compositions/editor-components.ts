import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import MockListPageTitle from '@/pre-designed/editor/MockListPageTitle.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import MockTable from '@/pre-designed/editor/MockTable.vue';
import BlueprintEntityForm from '@/modules/pre-designed/components/BlueprintEntityForm.vue';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import MockVChart from '@/pre-designed/editor/MockVChart.vue';
import RemoveConfirmation from '@/modules/pre-designed/components/RemoveConfirmation.vue';
import { toRef } from 'vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';

export interface EditorComponent {
  component: any;
  tag?: string;
  mock?: any;
  description?: string;
  classes?: string;
  requiredProps: Array<{
    prop: string,
    label?: string,
    type?: 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'array',
    description?: string,
    placeholder?: string,
    value?: any,
    bind?: boolean,
    source: string,
    children?: any[]
    valueBuilder?: (givenValue: string) => any
  }>;
  extendProps?: (props: any) => void;
  extendRequirements?: (requirements: any, props: any) => void;
  getInnerHTML?: (propsBuilder: any, props: any) => string;
}

export function useEditorComponents() {
  const blueprints = toRef(useBlueprintsStore(), 'blueprints');

  const availableComponents: Record<string, EditorComponent> = {
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
      ],
      extendRequirements: (requirements: any, props: any) => {
        requirements[props['v-bind:columns']]?.fromData.push({ prop: '_operations', label: ' ' })
      },
      getInnerHTML: (propsBuilder: any) => {
        return `<template #_operations="{row}"><remove-button @click="pageState ? (pageState.${propsBuilder.data}ToRemove = row.identifier) : null"/></template>`
      }
    },
    'blueprint-entity-form': {
      component: BlueprintEntityForm,
      mock: 'h2',
      description: 'Blueprint Form',
      requiredProps: [
        {
          prop: 'blueprint',
          source: 'blueprint',
        },
        {
          prop: 'data', label: 'Data', type: 'text', source: 'manual',
          bind: true,
          description: 'Data to be used in the form'
        },
        {
          prop: 'submit-msg',
          type: 'text',
          label: 'Success Message',
          placeholder: 'Submitted successfully',
          source: 'manual'
        },
        {
          prop: 'error-msg',
          type: 'text',
          label: 'Error Message',
          placeholder: 'Failed to submit entity',
          source: 'manual'
        },
        {
          prop: 'navigate-after-submit',
          type: 'text',
          label: 'Navigate After Submit',
          placeholder: 'Enter a route name to navigate after submit succeeded (entity `identifier` will be injected to route).',
          source: 'manual'
        },
        {
          prop: 'clear-after-submit', label: 'Clear Form After Submit?', type: 'switch', source: 'manual',
          bind: true,
          value: true,
        },
      ],
      getInnerHTML: (propsBuilder: any) => {
        const blueprintId = propsBuilder.blueprint;
        const blueprint = blueprints.value.find(b => b.identifier === blueprintId);
        if (!blueprint) {
          return '';
        }
        const blueprintsInputs = Object.keys(blueprint.properties).map((propName: any) => {
          const prop = blueprint.properties[propName];
          const propType = prop.type;
          const elementType = propType === 'boolean' ? 'switch' : propType;

          return `<form-input title="${prop.title}" type="${elementType}" label="${prop.description}" ${prop.required ? ':required="true"' : ''} v-model="form.${propName}"></form-input>`
        }).join('\n');

        return `<template #default="{form}">
    <edit-header>Edit ${blueprint.name}</edit-header>
    <div class="container">
    ${blueprintsInputs}
</div>
</template>`
      }
    },
    'v-chart': {
      component: VChart,
      mock: MockVChart,
      extendProps: (props: any) => {
        props[':autoresize'] = true;
      },
      requiredProps: [
        { prop: 'height', label: 'Height', type: 'text', source: 'manual', placeholder: '(400px)' },
        {
          prop: 'option',
          label: 'Option',
          type: 'text',
          bind: true,
          source: 'manual',
          placeholder: 'Enter a requirement key'
        },
      ]
    },
    'remove-confirmation': {
      component: RemoveConfirmation,
      mock: 'h2',
      description: 'Remove Confirmation',
      requiredProps: [
        { prop: 'resource', label: 'Resource', source: 'blueprint' },
      ],
      extendProps: (props: any) => {
        props['target'] = 'blueprint';
        props['v-model'] = `pageState.${props.resource}ToRemove`;
      },
      extendRequirements: (requirements: any, props: any) => {
        requirements.pageState = {
          key: 'pageState',
          fromData: {
            [`${props.resource}ToRemove`]: null
          }
        }
      }
    },
    'div.flex-row-column': {
      component: 'div',
      tag: 'div',
      mock: 'h2',
      description: 'Flex Row Column',
      classes: 'flex-row-column',
      requiredProps: [
        { prop: 'blocks', label: 'Blocks', type: 'number', source: 'manual', value: 2 },
      ],
      getInnerHTML(_, props) {
        const amount = Number(props.blocks || 0);
        delete props.blocks;
        if (amount) {
          return Array.from({ length: amount }).map((_, index) =>
            `<block-item class="flex-1">
        <template #header><h3>Column ${index + 1}</h3></template>
        <div>any content</div>
        <template #actions>
<div><el-button text>Remove</el-button><el-button text>Update</el-button></div>
        </template>
    </block-item>`).join('\n');
        }
        return '';
      },
    }
  }

  return {
    availableComponents
  }
}