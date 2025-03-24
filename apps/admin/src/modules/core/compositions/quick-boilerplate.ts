import { type Ref, capitalize } from 'vue'
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints'
import { getPlural } from '@/modules/core/utils/texts'
import { IScreenRequirement } from '@qelos/global-types';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';

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
<empty-state v-if="${dataKey}?.loaded && !${dataKey}.result.length" description="No ${getPlural(selectedBlueprint.name)} found">
  <el-button type="primary" v-on:click="$router.push({ query: { mode: 'create' } })">
    Create a ${selectedBlueprint.name}
  </el-button>
</empty-state>
<quick-table v-if="${dataKey}?.loaded && ${dataKey}.result?.length" :columns="tableColumns" :data="${dataKey}.result">
  ${availableComponents['quick-table']?.getInnerHTML({ data: dataKey, columns }, {}, boilerplate.requirements.reduce((obj, item) => ({ ...obj, [item.key]: item }), {}))}
</quick-table>
<remove-confirmation v-model="pageState.${dataKey}ToRemove" target="blueprint" resource="${selectedBlueprint.identifier}"></remove-confirmation>`
    }

    const dialogHTMLBefore = `<el-dialog :model-value="$route.query.mode === 'create'" @close="$router.push({ query: {} })">
<h2>{{form.identifier ? 'Edit' : 'Create'}} ${capitalize(selectedBlueprint.name)}</h2>`
    const dialogHTMLAfter = `<template #footer>
      <el-button type="primary" native-type="submit">
        {{ $t('Save') }}
      </el-button>
      <el-button @click="$router.push({ query: {} })">
        {{ $t('Cancel') }}
      </el-button>
    </template>
  </el-dialog>`

    boilerplate.structure += `
<blueprint-entity-form
  v-if="$route.query.mode === 'create' || $route.query.mode === 'edit'"
  :navigate-after-submit="{ query: {} }" 
  blueprint="${selectedBlueprint.identifier}" 
  v-bind:data="pageState.${selectedBlueprint.identifier}ToEdit"
  v-bind:clear-after-submit="true"
>
    ${availableComponents['blueprint-entity-form']?.getInnerHTML({
       blueprint: selectedBlueprint.identifier, hideHeader: true, htmlBefore: dialogHTMLBefore, htmlAfter: dialogHTMLAfter }, {}, boilerplate.requirements.reduce((obj, item) => ({ ...obj, [item.key]: item }), {}))}
</blueprint-entity-form>`

    return boilerplate
  }

  return { getBoilerPlate }
}
