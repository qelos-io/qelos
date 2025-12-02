import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import MockListPageTitle from '@/pre-designed/editor/MockListPageTitle.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import MockTable from '@/pre-designed/editor/MockTable.vue';
import BlueprintEntityForm from '@/modules/pre-designed/components/BlueprintEntityForm.vue';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import MockVChart from '@/pre-designed/editor/MockVChart.vue';
import RemoveConfirmation from '@/modules/pre-designed/components/RemoveConfirmation.vue';
import { computed, toRef } from 'vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import MockStatsCard from '@/pre-designed/editor/MockStatsCard.vue';
import AiChat from '@/modules/pre-designed/components/AiChat.vue';
import { useComponentsList } from '@/modules/blocks/store/components-list';
import kebabCase from 'lodash.kebabcase';
import MockAiChat from '@/pre-designed/editor/MockAiChat.vue';
import TemplatedRemoveButton from '@/modules/pre-designed/components/TemplatedRemoveButton.vue';
import TemplatedEditButton from '@/modules/pre-designed/components/TemplatedEditButton.vue';
import TemplatedViewButton from '@/modules/pre-designed/components/TemplatedViewButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';
import ConfirmMessage from '@/modules/pre-designed/components/ConfirmMessage.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import EditableContent from '@/modules/pre-designed/components/EditableContent.vue';
import Pre from '@/modules/pre-designed/components/Pre.vue';
import ContentBox from '@/modules/pre-designed/components/ContentBox.vue';
import QRating from '@/modules/pre-designed/components/QRating.vue';
import CopyToClipboard from '@/modules/pre-designed/components/CopyToClipboard.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import LifeCycle from '@/modules/pre-designed/components/LifeCycle.vue';
import AssetUploader from '@/modules/assets/components/AssetUploader.vue';


export interface EditorComponent {
  component: any;
  tag?: string;
  mock?: any;
  title?: string;
  description?: string;
  classes?: string;
  icon?: string;
  category?: 'layout' | 'data' | 'automation' | 'visualization' | 'messaging' | 'custom';
  tags?: string[];
  capabilities?: string[];
  docUrl?: string;
  requiredProps: Array<{
    prop: string,
    label?: string,
    type?: 'text' | 'textarea' | 'password' | 'button' | 'checkbox' | 'file' | 'number' | 'radio' | 'upload' | 'switch' | 'color' | 'url' | 'array' | 'select',
    description?: string,
    placeholder?: string,
    options?: Array<{ identifier: string, name: string }>,
    selectOptions?: Record<string, any>,
    optionsResolver?: 'aiChatUrls' | 'faIcons' | string,
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
  const customComponents = toRef(useComponentsList(), 'components');


  const staticComponents: Record<string, EditorComponent> = {
    'list-page-title': {
      title: 'List Page Title',
      description: 'A title and a button to create a new item.',
      component: ListPageTitle,
      mock: MockListPageTitle,
      category: 'layout',
      icon: 'document',
      tags: ['content', 'navigation'],
      capabilities: ['presentation'],
      docUrl: 'https://docs.qelos.io/components/list-page-title',
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
      category: 'layout',
      tags: ['responsive', 'structure'],
      icon: 'grid',
      capabilities: ['presentation'],
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
      category: 'layout',
      tags: ['content'],
      capabilities: ['presentation'],
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
      category: 'data',
      tags: ['table', 'crud'],
      icon: 'table',
      capabilities: ['data', 'actions'],
      docUrl: 'https://docs.qelos.io/components/quick-table',
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
      category: 'data',
      tags: ['forms', 'blueprints'],
      icon: 'edit',
      capabilities: ['data', 'actions'],
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
      category: 'visualization',
      tags: ['charts'],
      icon: 'trend-charts',
      capabilities: ['data'],
      extendProps: (props: any) => {
        props[':autoresize'] = true;
      },
      requiredProps: [
        { prop: 'height', label: 'Height', type: 'text', source: 'manual', placeholder: '(400px)' },
        {
          prop: 'blueprint',
          label: 'Blueprint',
          type: 'select',
          source: 'blueprint',
          placeholder: 'Select blueprint source'
        },
        {
          prop: 'chart-type',
          label: 'Chart Type',
          type: 'select',
          source: 'manual',
          value: 'line',
          options: [
            { identifier: 'line', name: 'Line' },
            { identifier: 'bar', name: 'Bar' },
            { identifier: 'pie', name: 'Pie' }
          ]
        },
        {
          prop: 'group-by',
          label: 'Group By Property',
          type: 'text',
          source: 'manual',
          placeholder: 'status',
          description: 'Enter the blueprint property key to aggregate (as defined in the blueprint metadata).'
        },
      ],
      extendRequirements: (requirements: any, props: any) => {
        const blueprintKey = props.blueprint;
        const blueprint = blueprints.value.find(b => b.identifier === blueprintKey);
        if (!blueprint) {
          return;
        }
        const chartType = props['chart-type'] || 'line';
        const groupByKey = props['group-by'] || Object.keys(blueprint.properties)[0];

        const requirementKey = `vChart_${blueprintKey}_${Date.now().toString(36)}`;
        const encodedBlueprint = encodeURIComponent(blueprintKey);
        const isPie = chartType === 'pie';
        const chartPath = isPie ? 'pie' : chartType;
        requirements[requirementKey] = {
          key: requirementKey,
          fromHTTP: {
            method: 'GET',
            uri: `/api/blueprints/${encodedBlueprint}/charts/${chartPath}`,
            query: {
              x: groupByKey
            }
          }
        };

        props['v-bind:option'] = `${requirementKey}.result`;
        props['v-bind:loading'] = `${requirementKey}.loading`;
        delete props.blueprint;
        delete props['chart-type'];
        delete props['group-by'];
      }
    },
    'remove-confirmation': {
      component: RemoveConfirmation,
      title: 'Remove Confirmation',
      description: 'Manage confirmation dialog to remove an entity.',
      requiredProps: [
        { prop: 'resource', label: 'Resource', source: 'blueprint' },
      ],
      category: 'automation',
      tags: ['modals', 'actions'],
      icon: 'warning',
      capabilities: ['actions'],
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
      mock: MockAiChat,
      category: 'messaging',
      tags: ['ai', 'conversation'],
      icon: 'chat-dot-round',
      capabilities: ['ai', 'automation'],
      docUrl: 'https://docs.qelos.io/components/ai-chat',
      requiredProps: [
        {
          prop: 'url',
          label: 'AI API URL',
          type: 'select',
          source: 'manual',
          placeholder: 'Select or enter an AI chat endpoint',
          description: 'Existing chat completion endpoints detected from your AI Agents.',
          optionsResolver: 'aiChatUrls',
          selectOptions: { filterable: true, allowCreate: true, defaultFirstOption: false }
        },
        { prop: 'title', label: 'Title', type: 'text', source: 'manual', placeholder: 'Enter the card title' },
        { prop: 'full-screen', label: 'Full Screen', type: 'switch', source: 'manual', bind: true, value: true },
        { prop: 'suggestions', label: 'Suggestions', type: 'array', bind: true, source: 'manual', 
          children: [
            { prop: 'label', label: 'Label', type: 'text', placeholder: 'Enter the label' },
            {
              prop: 'icon',
              label: 'Icon',
              type: 'select',
              placeholder: 'Select or type an icon name',
              optionsResolver: 'faIcons',
              selectOptions: { filterable: true, allowCreate: true }
            },
            { prop: 'text', label: 'Text', type: 'text', placeholder: 'Enter the text' },
          ]
        },
      ]
    },
    'stats-card': {
      component: StatsCard,
      mock: MockStatsCard,
      title: 'Statistics Card',
      category: 'visualization',
      tags: ['kpi', 'insights'],
      icon: 'data-analysis',
      capabilities: ['presentation'],
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
    ,
    'templated-remove-button': {
      component: TemplatedRemoveButton,
      title: 'Templated Remove Button',
      description: 'Pre-wired remove trigger for templated lists.',
      category: 'automation',
      tags: ['actions'],
      icon: 'delete',
      capabilities: ['actions'],
      requiredProps: []
    },
    'templated-edit-button': {
      component: TemplatedEditButton,
      title: 'Templated Edit Button',
      description: 'Pre-wired edit trigger for templated lists.',
      category: 'automation',
      tags: ['actions'],
      icon: 'edit',
      capabilities: ['actions'],
      requiredProps: []
    },
    'templated-view-button': {
      component: TemplatedViewButton,
      title: 'Templated View Button',
      description: 'Pre-wired detail trigger for templated lists.',
      category: 'automation',
      tags: ['actions'],
      icon: 'view',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'form-input': {
      component: FormInput,
      title: 'Form Input',
      description: 'Single input field with validation helpers.',
      category: 'data',
      tags: ['forms'],
      icon: 'edit-pen',
      capabilities: ['data'],
      requiredProps: [
        { prop: 'title', label: 'Label', type: 'text', source: 'manual', placeholder: 'Field label' },
        { prop: 'type', label: 'Type', type: 'select', source: 'manual', options: [
          { identifier: 'text', name: 'Text' },
          { identifier: 'textarea', name: 'Textarea' },
          { identifier: 'number', name: 'Number' },
          { identifier: 'password', name: 'Password' },
          { identifier: 'switch', name: 'Switch' },
        ], value: 'text' },
        { prop: 'placeholder', label: 'Placeholder', type: 'text', source: 'manual', placeholder: 'Enter placeholder text' }
      ]
    },
    'form-row-group': {
      component: FormRowGroup,
      title: 'Form Row Group',
      description: 'Horizontal alignment helper for form fields.',
      category: 'layout',
      tags: ['forms', 'layout'],
      icon: 'grid',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'save-button': {
      component: SaveButton,
      title: 'Save Button',
      description: 'Standardized primary save action.',
      category: 'automation',
      tags: ['actions'],
      icon: 'checked',
      capabilities: ['actions'],
      requiredProps: []
    },
    'edit-header': {
      component: EditHeader,
      title: 'Edit Header',
      description: 'Heading wrapper for editable sections.',
      category: 'layout',
      tags: ['headers'],
      icon: 'header',
      capabilities: ['presentation'],
      requiredProps: [
        { prop: 'title', label: 'Title', type: 'text', source: 'manual', placeholder: 'Section title' }
      ]
    },
    'info-icon': {
      component: InfoIcon,
      title: 'Info Icon',
      description: 'Inline helper tooltip icon.',
      category: 'layout',
      tags: ['help'],
      icon: 'info-filled',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'block-item': {
      component: BlockItem,
      title: 'Block Item Container',
      description: 'Reusable block with header/actions slots.',
      category: 'layout',
      tags: ['container'],
      icon: 'box',
      capabilities: ['presentation'],
      requiredProps: [],
      getInnerHTML: () => `<template #header>{{ $t('Block title') }}</template>\n<div>{{ $t('Add content here') }}</div>\n<template #actions><el-button text>{{ $t('Action') }}</el-button></template>`
    },
    'monaco-editor': {
      component: Monaco,
      title: 'Monaco Editor',
      description: 'Code editor powered by Monaco.',
      category: 'data',
      tags: ['code'],
      icon: 'code',
      capabilities: ['manual'],
      requiredProps: []
    },
    'general-form': {
      component: GeneralForm,
      title: 'General Form',
      description: 'Configurable form block with dynamic schema.',
      category: 'data',
      tags: ['forms'],
      icon: 'tickets',
      capabilities: ['data'],
      requiredProps: []
    },
    'confirm-message': {
      component: ConfirmMessage,
      title: 'Confirm Message',
      description: 'Confirmation block for destructive actions.',
      category: 'automation',
      tags: ['modals'],
      icon: 'question-filled',
      capabilities: ['actions'],
      requiredProps: []
    },
    'remove-button': {
      component: RemoveButton,
      title: 'Remove Button',
      description: 'Standard remove trigger with confirmation slot.',
      category: 'automation',
      tags: ['actions'],
      icon: 'delete',
      capabilities: ['actions'],
      requiredProps: []
    },
    'editable-content': {
      component: EditableContent,
      title: 'Editable Content',
      description: 'Inline rich-text area.',
      category: 'layout',
      tags: ['content'],
      icon: 'document',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'q-pre': {
      component: Pre,
      title: 'Preformatted Text',
      description: 'Stylized pre/code block.',
      category: 'layout',
      tags: ['content'],
      icon: 'document-copy',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'content-box': {
      component: ContentBox,
      title: 'Content Box',
      description: 'Card-like content container.',
      category: 'layout',
      tags: ['cards'],
      icon: 'box',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'q-rating': {
      component: QRating,
      title: 'Rating',
      description: 'Display or collect rating values.',
      category: 'data',
      tags: ['forms'],
      icon: 'star-filled',
      capabilities: ['data'],
      requiredProps: []
    },
    'copy-to-clipboard': {
      component: CopyToClipboard,
      title: 'Copy To Clipboard',
      description: 'Button to copy arbitrary text.',
      category: 'automation',
      tags: ['actions'],
      icon: 'copy-document',
      capabilities: ['actions'],
      requiredProps: [
        { prop: 'text', label: 'Text', type: 'text', source: 'manual', placeholder: 'Content to copy' }
      ]
    },
    'empty-state': {
      component: EmptyState,
      title: 'Empty State Panel',
      description: 'Communicates empty data situations.',
      category: 'layout',
      tags: ['states'],
      icon: 'picture',
      capabilities: ['presentation'],
      requiredProps: [
        { prop: 'title', label: 'Title', type: 'text', source: 'manual' },
        { prop: 'subtitle', label: 'Subtitle', type: 'text', source: 'manual' }
      ]
    },
    'life-cycle': {
      component: LifeCycle,
      title: 'Lifecycle Timeline',
      description: 'Visualizes lifecycle steps.',
      category: 'visualization',
      tags: ['timeline'],
      icon: 'timer',
      capabilities: ['presentation'],
      requiredProps: []
    },
    'asset-uploader': {
      component: AssetUploader,
      title: 'Asset Uploader',
      description: 'Upload and manage assets.',
      category: 'data',
      tags: ['files'],
      icon: 'upload-filled',
      capabilities: ['data'],
      requiredProps: []
    }
  }

  const availableComponents = computed(() => {
    const components = {
      ...staticComponents,
    }
    Object.entries(customComponents.value).forEach(([key, value]) => {
      components[kebabCase(value.componentName)] = {
        ...value,
        title: value.name || value.componentName || key,
        description: value.description,
        component: 'div',
        mock: value.mock,
        category: value.category || 'custom',
        tags: value.tags || ['custom'],
        icon: value.icon || 'box',
        capabilities: value.capabilities || ['custom'],
        docUrl: value.docUrl,
        requiredProps: (value.requiredProps || []).map((prop: any) => ({
          prop: prop.prop,
          type: prop.type,
          label: prop.label || prop.prop,
          source: prop.source || 'manual',
          placeholder: prop.placeholder || '',
          bind: prop.bind || false,
          enum: prop.enum || [],
        })),
        extendProps: value.extendProps || (() => {}),
        extendRequirements: value.extendRequirements || (() => {}),
      };
    })
    return components;  
  })


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