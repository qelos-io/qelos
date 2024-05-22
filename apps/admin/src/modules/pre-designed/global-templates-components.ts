import { App } from '@vue/runtime-core';
import TemplatedRemoveButton from './components/TemplatedRemoveButton.vue';
import TemplatedEditButton from './components/TemplatedEditButton.vue';
import TemplatedViewButton from './components/TemplatedViewButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';

export default function applyGlobalTemplatesComponents(app: App) {
  app.component('TemplatedRemoveButton', TemplatedRemoveButton)
  app.component('TemplatedEditButton', TemplatedEditButton)
  app.component('TemplatedViewButton', TemplatedViewButton)
  app.component('FormInput', FormInput)
  app.component('SaveButton', SaveButton)
  app.component('EditHeader', EditHeader)
}