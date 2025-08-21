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
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import MockStatsCard from '@/pre-designed/editor/MockStatsCard.vue';
import AiChat from '@/modules/pre-designed/components/AiChat.vue';

export interface EditorComponent {
  component: any;
  tag?: string;
  mock?: any;
  title?: string;
  description?: string;
  classes?: string;
  requiredProps: Array<{
    prop: string,
    label?: string,
    type?: 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'array' | 'select',
    description?: string,
    placeholder?: string,
    options?: Array<{ identifier: string, name: string }>,
    value?: any,
    bind?: boolean,
    source: string,
    children?: any[]
    valueBuilder?: (givenValue: string) => any
  }>;
  extendProps?: (props: any) => void;
  extendRequirements?: (requirements: any, props: any) => void;
  getInnerHTML?: (propsBuilder: any, props: any, requirements?: any) => string;
}

export function useEditorComponents() {
  const blueprints = toRef(useBlueprintsStore(), 'blueprints');

  const availableComponents: Record<string, EditorComponent> = {
    'list-page-title': {
      title: 'List Page Title',
      description: 'A title and a button to create a new item.',
      component: ListPageTitle,
      mock: MockListPageTitle,
      requiredProps: [
        { prop: 'title', label: 'Title', type: 'text', source: 'manual' },
        { prop: 'create-route-path', label: 'Path to Create New Item', type: 'text', source: 'manual' },
      ]
    },
    'div.flex-row-column': {
      component: 'div',
      tag: 'div',
      title: 'Flex Row (Desktop) / Column (Mobile)',
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
    },
    'container': {
      component: 'div',
      tag: 'div',
      title: 'Container',
      classes: 'container',
      requiredProps: [
        { prop: 'paragraphs', label: 'Paragraphs', type: 'number', source: 'manual', value: 2 },
      ],
      getInnerHTML(_, props) {
        const amount = Number(props.paragraphs || 0);
        delete props.paragraphs;
        if (amount) {
          return Array.from({ length: amount }).map((_, index) =>
            `<p>Paragraph ${index + 1}</p>`).join('\n');
        }
        return '';
      },
    },
    'quick-table': {
      title: 'Quick Table',
      description: 'This table includes a remove button for each row and pagination.',
      component: QuickTable,
      mock: MockTable,
      requiredProps: [
        { prop: 'data', label: 'Data', type: 'array', source: 'requirements' },
        {
          prop: 'columns', label: 'Columns', type: 'array', source: 'manual',
          children: [
            { prop: 'prop', label: 'Property', type: 'text' },
            { prop: 'label', label: 'Label', type: 'text' },
            { prop: 'minWidth', label: 'Min Width', type: 'text' },
            { prop: 'fixed', label: 'Fixed', type: 'switch' },
            { prop: 'sortable', label: 'Sortable', type: 'select', options: [{identifier: 'true', name: 'Ascending'}, {identifier: 'false', name: 'Descending'}] },
            { prop: 'filterable', label: 'Filterable', type: 'switch' },
            { prop: 'className', label: 'Class Name', type: 'text' },
            { prop: 'type', label: 'Type', type: 'select', options: [
              {identifier: 'string', name: 'String (Text)'},
              {identifier: 'selection', name: 'Selection'},
              {identifier: 'expand', name: 'Expand'},
              {identifier: 'index', name: 'Index'},
              {identifier: 'date', name: 'Date'},
              {identifier: 'datetime', name: 'Datetime'},
              {identifier: 'boolean', name: 'Boolean'},
              {identifier: 'status', name: 'Status'},
              {identifier: 'actions', name: 'Actions'},
              {identifier: 'image', name: 'Image'},
              {identifier: 'tags', name: 'Tags'},
              {identifier: 'link', name: 'Link'},
              {identifier: 'number', name: 'Number'},
              {identifier: 'currency', name: 'Currency'},
              {identifier: 'percent', name: 'Percent'},
              {identifier: 'file', name: 'File'}
            ] },
            { prop: 'resizable', label: 'Resizable', type: 'switch' },
          ]
        }
      ],    
      extendRequirements: (requirements: any, props: any) => {
        requirements[props['v-bind:columns']]?.fromData.push({ prop: '_operations', label: ' ' })
      },
      getInnerHTML: (propsBuilder: any, _props, requirements = {}) => {
        let html = `<template #_operations="{row}"><remove-button @click="pageState ? (pageState.${propsBuilder.data}ToRemove = row.identifier) : null"/></template>`;
        return html;
      }
    },
    'blueprint-entity-form': {
      component: BlueprintEntityForm,
      title: 'Blueprint Form',
      description: 'Complete form to create a new blueprint entity.',
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
          // Set element type to 'select' for string properties with enum options
          let elementType = propType === 'boolean' ? 'switch' : propType;
          if (propType === 'string' && Array.isArray(prop.enum) && prop.enum.length > 0) {
            elementType = 'select';
          }
          
          // Check if the property has enum options and prepare the options attribute
          let enumOptionsAttr = '';
          if (Array.isArray(prop.enum) && prop.enum.length > 0) {
            // Convert the enum array to a properly formatted string for Vue template
            const formattedOptions = prop.enum.map(opt => {
              return typeof opt === 'string' ? `'${opt}'` : opt;
            }).join(', ');
            enumOptionsAttr = `:options="[${formattedOptions}]"`;
          }
          
          return `<form-input title="${prop.title}" type="${elementType}" label="${prop.description}" ${prop.required ? ':required="true"' : ''} ${enumOptionsAttr} v-model="form.${propName}"></form-input>`
        }).join('\n');

        return `<template #default="{form}">
    ${propsBuilder.hideHeader ? '' : `<edit-header>{{form.identifier ? 'Edit' : 'Create'}} ${blueprint.name}</edit-header>`}
    <div class="container">
    ${propsBuilder.htmlBefore || ''}
    ${blueprintsInputs}
    ${propsBuilder.htmlAfter || ''}
</div>
</template>`
      }
    },
    'v-chart': {
      title: 'Apache EChart',
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
      title: 'Remove Confirmation',
      description: 'Manage confirmation dialog to remove an entity.',
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
    'ai-chat': {
      title: 'AI Chat',
      description: 'A chat interface with AI assistant and file upload support.',
      component: AiChat,
      requiredProps: [
        { prop: 'url', label: 'AI API URL', type: 'text', source: 'manual', placeholder: 'https://...' },
        { prop: 'title', label: 'Title', type: 'text', source: 'manual', placeholder: 'Enter the card title' },
        { prop: 'suggestions', label: 'Suggestions', type: 'array', source: 'manual', 
          children: [
            { prop: 'label', label: 'Label', type: 'text', placeholder: 'Enter the label' },
            { prop: 'icon', label: 'Icon', type: 'text', placeholder: 'Enter the icon' },
            { prop: 'text', label: 'Text', type: 'text', placeholder: 'Enter the text' },
          ]
        },
      ]
    },
    'stats-card': {
      component: StatsCard,
      mock: MockStatsCard,
      title: 'Statistics Card',
      requiredProps: [
        { prop: 'title', label: 'Title', type: 'text', source: 'manual', placeholder: 'Enter the card title' },
        {
          prop: 'color', label: 'Color', type: 'select', source: 'manual', placeholder: 'Choose a color',
          options: [
            { identifier: 'blue', name: 'Blue' },
            { identifier: 'green', name: 'Green' },
            { identifier: 'red', name: 'Red' },
            { identifier: 'yellow', name: 'Yellow' },
            { identifier: 'purple', name: 'Purple' },
            { identifier: 'gray', name: 'Gray' },
            { identifier: 'orange', name: 'Orange' },
            { identifier: 'pink', name: 'Pink' },
            { identifier: 'cyan', name: 'Cyan' },
            { identifier: 'primary', name: 'Primary' },
            { identifier: 'success', name: 'Success' },
            { identifier: 'warning', name: 'Warning' },
            { identifier: 'danger', name: 'Danger' },
            { identifier: 'info', name: 'Info' },
          ]
        },
        {
          prop: 'fa-icon', label: 'Background Icon from Font-awesome', bind: true,
          description: 'Look for icons at: https://fontawesome.com/search?o=r&m=free',
          type: 'text', source: 'manual', placeholder: 'Font Awesome icon name (e.g. [\'fas\', \'briefcase\']).'
        },
        {
          prop: 'value',
          label: 'Value',
          type: 'text',
          bind: true,
          source: 'manual',
          placeholder: 'Enter a number or a reference to a variable'
        },
        { prop: 'action-text', label: 'Action Text', type: 'text', source: 'manual', placeholder: 'Do Something' },
        {
          prop: 'action-route',
          label: 'Action Route',
          type: 'text',
          source: 'manual',
          placeholder: 'Path to navigate when action clicked (e.g. /my-page).'
        },
      ],
    }
  }

  function getColumnsFromBlueprint(blueprintId: string) {
    const blueprint = blueprints.value.find(b => b.identifier === blueprintId);
    if (!blueprint) {
      return;
    }
    return Object.keys(blueprint.properties).map((propName: any) => {
      const prop = blueprint.properties[propName];
      return {
        prop: 'metadata.' + propName,
        label: prop.title,
        fixed: prop.type === 'boolean',
        type: prop.type
      }
    })
  }

  return {
    availableComponents,
    getColumnsFromBlueprint
  }
}