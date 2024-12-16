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
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';
import ConfirmMessage from '@/modules/pre-designed/components/ConfirmMessage.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import BlueprintEntityForm from '@/modules/pre-designed/components/BlueprintEntityForm.vue';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import EditableContent from '@/modules/pre-designed/components/EditableContent.vue';
import RemoveConfirmation from './components/RemoveConfirmation.vue';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import Pre from '@/modules/pre-designed/components/Pre.vue';
import ContentBox from '@/modules/pre-designed/components/ContentBox.vue';

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
  app.component('GeneralForm', GeneralForm)
  app.component('BlueprintEntityForm', BlueprintEntityForm)
  app.component('ConfirmMessage', ConfirmMessage)
  app.component('RemoveButton', RemoveButton)
  app.component('VChart', VChart)
  app.component('EditableContent', EditableContent)
  app.component('RemoveConfirmation', RemoveConfirmation)
  app.component('StatsCard', StatsCard)
  app.component('QPre', Pre)
  app.component('ContentBox', ContentBox);
}