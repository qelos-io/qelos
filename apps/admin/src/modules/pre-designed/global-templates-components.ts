import { App } from '@vue/runtime-core';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import ContentBox from '@/modules/pre-designed/components/ContentBox.vue';
import QRating from '@/modules/pre-designed/components/QRating.vue';
import CopyToClipboard from '@/modules/pre-designed/components/CopyToClipboard.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import LifeCycle from '@/modules/pre-designed/components/LifeCycle.vue';
import AiChat from '@/modules/pre-designed/components/AiChat.vue';
import AssetUploader from '@/modules/assets/components/AssetUploader.vue';
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue';
import { defineAsyncComponent } from 'vue';

export default function applyGlobalTemplatesComponents(app: App) {
  app.component('TemplatedRemoveButton', defineAsyncComponent(async () => (await import('./components/TemplatedRemoveButton.vue')).default))
  app.component('TemplatedEditButton', defineAsyncComponent(async () => (await import('./components/TemplatedEditButton.vue')).default))
  app.component('TemplatedViewButton', defineAsyncComponent(async() => (await import('./components/TemplatedViewButton.vue')).default))
  app.component('FormInput', FormInput)
  app.component('FormRowGroup', FormRowGroup)
  app.component('SaveButton', SaveButton)
  app.component('EditHeader', EditHeader)
  app.component('InfoIcon', InfoIcon)
  app.component('BlockItem', BlockItem)
  app.component('Monaco', defineAsyncComponent(async () => (await import('@/modules/users/components/Monaco.vue')).default))
  app.component('QuickTable', QuickTable)
  app.component('ListPageTitle', ListPageTitle)
  app.component('GeneralForm', defineAsyncComponent(async () => (await import('./components/GeneralForm.vue')).default))
  app.component('BlueprintEntityForm',  defineAsyncComponent(async () => (await import('./components/BlueprintEntityForm.vue')).default)
  app.component('ConfirmMessage', defineAsyncComponent(async () => (await import('./components/ConfirmMessage.vue')).default))
  app.component('RemoveButton', RemoveButton)
  app.component('VChart', defineAsyncComponent(async () => (await import('./components/VChart.vue')).default))
  app.component('EditableContent', defineAsyncComponent(async () => (await import('./components/EditableContent.vue')).default))
  app.component('RemoveConfirmation', defineAsyncComponent(async () => (await import('./components/RemoveConfirmation.vue')).default))
  app.component('StatsCard', StatsCard)
  app.component('QPre', defineAsyncComponent(async () => (await import('./components/Pre.vue')).default))
  app.component('ContentBox', ContentBox)
  app.component('QRating', QRating)
  app.component('CopyToClipboard', CopyToClipboard)
  app.component('EmptyState', EmptyState)
  app.component('LifeCycle', LifeCycle)
  app.component('AiChat', AiChat)
  app.component('AssetUploader', AssetUploader)
  app.component('ThreadsList', ThreadsList)
}