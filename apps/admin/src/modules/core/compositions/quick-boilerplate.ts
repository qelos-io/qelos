import { type Ref, capitalize } from 'vue'
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints'
import { getPlural } from '@/modules/core/utils/texts'
import { IScreenRequirement } from '@qelos/global-types';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';

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

    const dialogHTMLBefore = `<el-dialog :model-value="$route.query.mode === 'create' || $route.query.mode === 'edit'" @close="$router.push({ query: {} })">
    <h2>{{form.identifier ? 'Edit' : 'Create'}} ${capitalize(selectedBlueprint.name)}</h2>`;
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
    ${availableComponents['blueprint-entity-form']?.getInnerHTML({
       blueprint: selectedBlueprint.identifier, hideHeader: true, htmlBefore: dialogHTMLBefore, htmlAfter: dialogHTMLAfter }, {}, boilerplate.requirements.reduce((obj, item) => ({ ...obj, [item.key]: item }), {}))}
</blueprint-entity-form>`

    if (boilerplateType.value === 'table') {
      const dataKey = getPlural(selectedBlueprint.identifier)
      const columns = [...getColumnsFromBlueprint(selectedBlueprint.identifier), { prop: '_operations', label: ' ' }]
      
      boilerplate.requirements.push({
        key: 'tableColumns',
        fromData: columns
      }, {
        key: dataKey,
        fromBlueprint: { name: selectedBlueprint.identifier }
      })

      boilerplate.structure += `
${getEmptyState(dataKey, selectedBlueprint.name)}
<quick-table v-if="${dataKey}?.loaded && ${dataKey}.result?.length" :columns="tableColumns" :data="${dataKey}.result">
  ${availableComponents['quick-table']?.getInnerHTML({ data: dataKey, columns }, {}, boilerplate.requirements.reduce((obj, item) => ({ ...obj, [item.key]: item }), {}))}
</quick-table>
${getRemoveConfirmation(dataKey, selectedBlueprint.identifier)}`
    } else if (boilerplateType.value === 'grid') {
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
    }

    boilerplate.structure += dialog;

    return boilerplate
  }

  return { getBoilerPlate }
}
