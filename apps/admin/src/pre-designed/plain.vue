<template>
  <main>
    <VRuntimeTemplate v-if="item" :template="relevantStructure"
                      @removeComponent="removeComponent"
                      :template-props="{...requirements, row: item, schema: crud.schema, cruds, user}"/>
    <AddMore v-if="isEditingEnabled" @click="openAddComponentModal"/>

    <AddComponentModal v-if="addComponent" @save="submitComponentToTemplate" @close="addComponent = undefined"/>
  </main>
</template>

<script lang="ts" setup>
import { provide, ref, toRef, toRefs } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import { useAuth } from '@/modules/core/compositions/authentication';
import { isEditingEnabled } from '@/modules/core/store/auth';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import AddComponentModal from '@/pre-designed/editor/AddComponentModal.vue';
import { useRoute } from 'vue-router';
import { useEditPlugin } from '@/modules/plugins/compositions/manage-plugin';
import { IMicroFrontend } from '@/services/types/plugin';

const route = useRoute();
const { load: loadPlugin, updatePlugin } = useEditPlugin()
const mfes = usePluginsMicroFrontends();
const item = ref();

const cruds = toRef(mfes, 'cruds')

const { user } = useAuth()

const { api, crud, relevantStructure } = useSingleItemCrud()
useDynamicRouteItem(api, item);

const addComponent = ref()

function openAddComponentModal(el?: HTMLElement) {
  addComponent.value = {
    afterEl: el,
  }
}

async function submitComponentToTemplate(data) {
  const el = document.createElement(data.component);

  Object.keys(data.props).forEach(propName => {
    el.setAttribute('v-bind:' + propName, typeof data.props[propName] === 'object' ? JSON.stringify(data.props[propName]) : data.props[propName] + '?.result');
  })

  const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId)

  const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === route.meta.mfe._id);
  pluginMfe.structure ||= '';

  pluginMfe.structure += el.outerHTML.trim();
  pluginMfe.requirements ||= [];
  pluginMfe.requirements.push(...Object.values(data.requirements) as any[])

  await updatePlugin(plugin)
}

async function removeComponent(el: HTMLElement) {
  const index = Array.from(el.parentElement.children).findIndex(child => child === el)

  const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
  const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === route.meta.mfe._id);
  const template = document.createElement('template');

  template.innerHTML = pluginMfe.structure;
  const child = template.content.children[index];
  template.content.removeChild(template.content.childNodes[index]);
  pluginMfe.structure = template.innerHTML.trim();

  child.getAttributeNames()
      .filter(attr => attr.startsWith('v-bind:'))
      .map(attr => child.getAttribute(attr).split('.')[0])
      .forEach(optionalKey => {
        if (pluginMfe.requirements.find(req => req.key === optionalKey)) {
          pluginMfe.requirements = pluginMfe.requirements.filter(req => req.key !== optionalKey)
        }
      })

  await updatePlugin(plugin)
}

const { requirements } = toRefs(useScreenRequirementsStore())
provide('isEditable', isEditingEnabled);
</script>