import { type Ref, capitalize } from 'vue'
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints'
import { getPlural } from '@/modules/core/utils/texts'
import { IScreenRequirement } from '@qelos/global-types';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';

type TableLayoutOptions = {
  withStats?: boolean
  extraBeforeTable?: (dataKey: string) => string
}

function getRemoveConfirmation(dataKey: string, blueprintIdentifier: string) {
  return `<remove-confirmation v-model="pageState.${dataKey}ToRemove" target="blueprint" resource="${blueprintIdentifier}"></remove-confirmation>`;
}

function getEmptyState(dataKey: string, blueprintName: string) {
  return `<empty-state v-if="${dataKey}?.loaded && !${dataKey}.result.length" description="No ${getPlural(blueprintName)} found">
  <el-button type="primary" v-on:click="$router.push({ query: { mode: 'create' } })">
    Create a ${blueprintName}
  </el-button>
</empty-state>`;
}

function buildRequirementsMap(requirements: IScreenRequirement[]) {
  return requirements.reduce<Record<string, IScreenRequirement>>((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {})
}

function getStatsSection(dataKey: string, blueprintName: string, blueprintIdentifier: string, blueprint?: any) {
  const pluralName = capitalize(getPlural(blueprintName));
  const identifier = blueprintIdentifier || blueprintName;
  
  // Check if there are numeric properties that could be summed
  const numericProps = Object.entries(blueprint?.properties || {})
    .filter(([key, prop]: [string, any]) => prop?.type === 'number')
    .slice(0, 2); // Limit to first 2 numeric properties
  
  const countKey = `${identifier}Count`;
  const sumKeys = numericProps.map(prop => `${identifier}${capitalize(prop[0])}Sum`);
  
  return `<div class="flex-row flex-wrap" style="gap: 1rem;">
  <stats-card :title="'${pluralName} Total'" color="primary" icon="collection" :value="${countKey}?.count || 0}"></stats-card>
  ${numericProps.map((prop, index) => {
    const sumKey = sumKeys[index];
    const propName = prop[0];
    const propTitle = (prop[1] as any)?.title || capitalize(propName);
    return `<stats-card :title="'Total ${propTitle}'" color="info" icon="coin" :value="${sumKey}?.sum || 0}"></stats-card>`;
  }).join('\n  ')}
  <stats-card :title="'Active ${pluralName}'" color="success" icon="checked" :value="${dataKey}?.result?.filter(item => item.metadata?.status === 'active').length || 0}"></stats-card>
  <stats-card :title="'Draft ${pluralName}'" color="warning" icon="document" :value="${dataKey}?.result?.filter(item => item.metadata?.status === 'draft').length || 0}"></stats-card>
</div>`;
}

function getHighlightsSection(dataKey: string, selectedBlueprint: any) {
  const highlightProps = Object.entries(selectedBlueprint?.properties || {})
    .filter(([key, prop]: [string, any]) => key !== 'title' && prop?.type !== 'file')
    .slice(0, 3);

  if (!highlightProps.length) {
    return '';
  }

  const propertyRows = highlightProps.map(([key, prop]: [string, any]) => {
    return `<div class="property-row"><strong>${prop?.title || capitalize(key)}:</strong> {{ item.metadata?.${key} ?? '—' }}</div>`;
  }).join('\n');

  return `<div class="flex-row-column flex-wrap" style="gap: 1rem;">
  <block-item v-for="item in (${dataKey}.result || []).slice(0, 3)" :key="item.identifier" class="flex-1" style="min-inline-size: 280px">
    <template #title>
      {{ item.metadata?.title || item.metadata?.name || 'Untitled' }}
    </template>
    ${propertyRows}
  </block-item>
</div>`;
}

export function useQuickBoilerplate({
  blueprintIdentifier,
  pageName,
  boilerplateType,
}: {
  blueprintIdentifier: Ref<string>
  pageName: Ref<string>
  boilerplateType: Ref<string>
}) {
  const blueprintsStore = useBlueprintsStore()
  const { availableComponents, getColumnsFromBlueprint } = useEditorComponents();

  const getBoilerPlate = () => {
    const selectedBlueprint = blueprintsStore.blueprints.find(b => b.identifier === blueprintIdentifier.value)
    const pageTitle = capitalize(pageName.value)

    if (!selectedBlueprint) {
      return {
        structure: `<h1>${pageTitle}</h1>`,
        requirements: []
      }
    }

    const boilerplate: { structure: string; requirements: IScreenRequirement[] } = {
      structure: `<list-page-title title="${pageTitle}" v-bind:create-route-query="{ mode: $route.query.mode ? undefined : 'create' }"></list-page-title>`,
      requirements: [{
        key: 'pageState',
        fromData: { pageTitle }
      }]
    }

    const getRequirementsMap = () => buildRequirementsMap(boilerplate.requirements);

    const dialogHTMLBefore = `<el-dialog :model-value="$route.query.mode === 'create' || $route.query.mode === 'edit'" @close="$router.push({ query: {} })">
    <h2>{{$route.query.mode === 'edit' ? 'Edit' : 'Create'}} ${capitalize(selectedBlueprint.name)}</h2>`;
    const dialogHTMLAfter = `<template #footer>
          <el-button type="primary" native-type="submit">
            {{ $t('Save') }}
          </el-button>
          <el-button @click="$router.push({ query: {} })">
            {{ $t('Cancel') }}
          </el-button>
        </template>
      </el-dialog>`;
    
    const dialog = `<blueprint-entity-form
  v-if="$route.query.mode === 'create' || $route.query.mode === 'edit'"
  :navigate-after-submit="{ query: {} }" 
  blueprint="${selectedBlueprint.identifier}" 
  v-bind:data="pageState.${selectedBlueprint.identifier}ToEdit"
  v-bind:identifier="$route.query.identifier"
  v-bind:clear-after-submit="true"
>
    ${availableComponents.value['blueprint-entity-form']?.getInnerHTML({
       blueprint: selectedBlueprint.identifier, hideHeader: true, htmlBefore: dialogHTMLBefore, htmlAfter: dialogHTMLAfter }, {}, getRequirementsMap())}
</blueprint-entity-form>`

    const appendTableLayout = ({
      withStats,
      extraBeforeTable
    }: TableLayoutOptions = {}) => {
      const dataKey = getPlural(selectedBlueprint.identifier)
      const columns = [...(getColumnsFromBlueprint(selectedBlueprint.identifier) || []), { prop: '_operations', label: ' ' }]

      boilerplate.requirements.push({
        key: 'tableColumns',
        fromData: columns
      }, {
        key: dataKey,
        fromBlueprint: { name: selectedBlueprint.identifier }
      })

      // Add count and sum requirements if stats are enabled
      if (withStats) {
        // Add count requirement
        boilerplate.requirements.push({
          key: `${selectedBlueprint.identifier}Count`,
          fromHTTP: {
            uri: `/api/blueprints/${selectedBlueprint.identifier}/charts/count`,
            method: 'GET',
            query: {
              workspace: '{{workspace._id}}'
            }
          }
        })

        // Add sum requirements for numeric properties
        const numericProps = Object.entries(selectedBlueprint?.properties || {})
          .filter(([key, prop]: [string, any]) => prop?.type === 'number')
          .slice(0, 2);
        
        numericProps.forEach(([propName]) => {
          boilerplate.requirements.push({
            key: `${selectedBlueprint.identifier}${capitalize(propName)}Sum`,
            fromHTTP: {
              uri: `/api/blueprints/${selectedBlueprint.identifier}/charts/sum`,
              method: 'GET',
              query: {
                workspace: '{{workspace._id}}',
                sum: propName
              }
            }
          })
        })
      }

      const statsSection = withStats ? getStatsSection(dataKey, selectedBlueprint.name, selectedBlueprint.identifier, selectedBlueprint) : ''
      const beforeTableSection = extraBeforeTable ? extraBeforeTable(dataKey) : ''

      boilerplate.structure += `
${statsSection}
${beforeTableSection}
${getEmptyState(dataKey, selectedBlueprint.name)}
<quick-table v-if="${dataKey}?.loaded && ${dataKey}.result?.length" :columns="tableColumns" :data="${dataKey}.result">
  ${availableComponents.value['quick-table']?.getInnerHTML({ blueprint: selectedBlueprint.identifier, data: dataKey, columns }, {}, getRequirementsMap())}
</quick-table>
${getRemoveConfirmation(dataKey, selectedBlueprint.identifier)}`
    }

    if (boilerplateType.value === 'grid') {
      const dataKey = getPlural(selectedBlueprint.identifier)
      const columns = [...getColumnsFromBlueprint(selectedBlueprint.identifier), { prop: '_operations', label: ' ' }]
      
      boilerplate.requirements.push({
        key: 'gridColumns',
        fromData: columns
      }, {
        key: dataKey,
        fromBlueprint: { name: selectedBlueprint.identifier }
      })

      boilerplate.structure += `
${getEmptyState(dataKey, selectedBlueprint.name)}
<div class="flex-row-column flex-wrap" v-if="${dataKey}?.loaded && ${dataKey}.result?.length">
<block-item v-for="item in ${dataKey}.result" :key="item.identifier" class="flex-1 property-card">
  <template #title>
    {{ item.metadata?.title || item.metadata?.name || 'Untitled' }}
  </template>
  
  <div class="item-properties flex-container">
    ${Object.entries(selectedBlueprint?.properties)
      .map(([key, {title, type, description}]) => (key === 'title' || type === 'file') ?  `` :
      `<div class="property-row"><strong>${title}:</strong> {{item.metadata.${key}}}</div>`).join('\n')}
  </div>
  
  <template #actions>
    <div class="flex-row flex-space">
      <el-button 
        type="primary" 
        circle
        @click="pageState.${selectedBlueprint.identifier}ToEdit = item.metadata; $router.push({query: {...$route.query, mode: 'edit', identifier: item.identifier}})">
        <el-icon><icon-edit></icon-edit></el-icon>
      </el-button>
      <el-button 
        type="danger" 
        circle 
        @click="pageState ? (pageState.${dataKey}ToRemove = item.identifier) : null"
      ><el-icon><icon-delete></icon-delete></el-icon></el-button>
    </div>
  </template>
</block-item>
</div>
${getRemoveConfirmation(dataKey, selectedBlueprint.identifier)}`
    } else if (boilerplateType.value === 'table-stats') {
      appendTableLayout({ withStats: true })
    } else if (boilerplateType.value === 'dashboard') {
      appendTableLayout({
        withStats: true,
        extraBeforeTable: (dataKey) => getHighlightsSection(dataKey, selectedBlueprint)
      })
    }
     else {
      appendTableLayout()
    }

    boilerplate.structure += dialog;

    return boilerplate
  }

  return { getBoilerPlate }
}
