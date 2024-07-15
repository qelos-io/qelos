import { App } from '@vue/runtime-core';
import TemplatedRemoveButton from './components/TemplatedRemoveButton.vue';
import TemplatedEditButton from './components/TemplatedEditButton.vue';
import TemplatedViewButton from './components/TemplatedViewButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';

export default function applyGlobalTemplatesComponents(app: App) {
  app.component('TemplatedRemoveButton', TemplatedRemoveButton)
  app.component('TemplatedEditButton', TemplatedEditButton)
  app.component('TemplatedViewButton', TemplatedViewButton)
  app.component('FormInput', FormInput)
  app.component('FormRowGroup', FormRowGroup)
  app.component('SaveButton', SaveButton)
  app.component('EditHeader', EditHeader)
  app.component('InfoIcon', InfoIcon)
  app.component('BlockItem', BlockItem)
  app.component('Monaco', Monaco)
  app.component('QuickTable', QuickTable)
  app.component('ListPageTitle', ListPageTitle)

}