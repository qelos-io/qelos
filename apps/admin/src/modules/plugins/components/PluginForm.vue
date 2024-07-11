<template>
  <el-form @submit.native.prevent="submit">
    <EditPluginHeader :plugin="plugin"/>
    <div class="content">
      <div class="fast-refresh-manifest">
        <FormRowGroup>
          <FormInput title="Manifest URL" label="required" v-model="edit.manifestUrl"/>
          <FormInput title="Plugin API Path" label="Leave empty to auto-set" v-model="edit.apiPath"/>
        </FormRowGroup>
        <div centered>
          <el-button type="text" class="refresh-manifest" @click="refreshPluginFromManifest">
            <el-icon>
              <icon-refresh/>
            </el-icon>
          </el-button>
        </div>
      </div>
      <el-collapse accordion>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('Basic Information') }}</h2>
          </template>
          <FormRowGroup>
            <FormInput title="Name" v-model="edit.name"/>
            <FormInput title="Description" v-model="edit.description"/>
          </FormRowGroup>
        </el-collapse-item>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('APIs') }}</h2>
          </template>
          <FormRowGroup>
            <FormInput title="API Path" :label="apiPathLabel" v-model="edit.apiPath"/>
            <FormInput title="Proxy URL" :label="proxyUrlLabel" v-model="edit.proxyUrl"/>
          </FormRowGroup>
        </el-collapse-item>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('Hooks & Events') }}</h2>
          </template>
          Soon
        </el-collapse-item>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('CRUDs') }}</h2>
          </template>
          Soon
        </el-collapse-item>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('Micro-Frontends') }}</h2>
          </template>
          <div v-for="(mfe, index) in edit.microFrontends" :key="index" class="sub-item">
            <FormRowGroup>
              <FormInput class="flex-0" type="switch" v-model="mfe.active"/>
              <FormInput title="Name" v-model="mfe.name"/>
              <FormInput title="Description" v-model="mfe.description"/>
              <div class="flex-0 remove-row">
                <RemoveButton @click="edit.microFrontends.splice(index, 1)"/>
              </div>
            </FormRowGroup>
            <FormRowGroup>
              <FormInput title="URL" v-model="mfe.url"/>
              <FormInput title="Roles" :model-value="mfe.roles.join(',')"
                         @update:modelValue="mfe.roles = $event.split(',')"/>
              <FormInput title="Workspace Roles" :model-value="mfe.workspaceRoles"
                         @update:modelValue="mfe.workspaceRoles = $event.split(',')"/>
            </FormRowGroup>
            <FormInput title="Route?" type="switch"
                       :model-value="!!mfe.route"
                       @change="mfe.route = $event ? {navBarPosition: false} : undefined"/>
            <FormRowGroup v-if="mfe.route">
              <FormInput title="Route Name" v-model="mfe.route.name"/>
              <FormInput title="Route Path" v-model="mfe.route.path"/>
              <NavigationPositionSelector v-model="mfe.route.navBarPosition"/>
            </FormRowGroup>
            <FormRowGroup >
              <FormInput title="No code / Low Code Screens?" type="switch"
                         :model-value="!!mfe.use"
                         @change="mfe.use = $event ? 'plain' : undefined"/>
              <PreDesignedScreensSelector v-if="mfe.use" v-model="mfe.use"/>
            </FormRowGroup>
          </div>
          <AddMore @click="addMoreMicroFrontend"/>
        </el-collapse-item>
        <el-collapse-item>
          <template #title>
            <h2>{{ $t('Injectables') }}</h2>
          </template>
          <div v-for="(inject, index) in edit.injectables" class="sub-item" :key="index">
            <FormRowGroup>
              <FormInput class="flex-0" type="switch" v-model="inject.active"/>
              <FormInput title="Name" v-model="inject.name"/>
              <FormInput title="Description" v-model="inject.description"/>
              <div class="flex-0 remove-row">
                <RemoveButton @click="edit.injectables.splice(index, 1)"/>
              </div>
            </FormRowGroup>
            <Monaco v-if="inject.active" v-model="inject.html" language="html"/>
          </div>
          <AddMore @click="addMoreInjectable"/>
        </el-collapse-item>
      </el-collapse>

      <h2>{{ $t('Summary') }}</h2>
      <Monaco ref="editor" :model-value="pluginJson" @change="pluginJson = editor.getMonaco().getValue()" language="json"/>
    </div>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, PropType, provide, reactive, ref, toRef, watch } from 'vue';
import { IPlugin } from '@/services/types/plugin';
import EditPluginHeader from './EditPluginHeader.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import NavigationPositionSelector from '@/modules/plugins/components/NavigationPositionSelector.vue';
import PreDesignedScreensSelector from '@/modules/plugins/components/PreDesignedScreensSelector.vue';

const props = defineProps({
  plugin: Object as PropType<Partial<IPlugin>>,
  submitting: Boolean
});

provide('submitting', toRef(props, 'submitting'))
const editor = ref()
const emit = defineEmits(['submitted']);

const edit = reactive<Partial<IPlugin>>({ ...props.plugin as Partial<IPlugin> });

const pluginJson = computed({
  get: () => JSON.stringify({ ...edit, injectables: edit.injectables, microFrontends: edit.microFrontends }, null, 2),
  set: (value: string) => {
    try {
      Object.assign(edit, JSON.parse(value));
    } catch(err) {
      console.log(err)
    }
  }
});

watch(edit, () => {
  editor.value.updateValue(pluginJson.value)
}, { deep: true })

const apiPathLabel = computed(() => `Every call to ${location.protocol}//${location.host}/api/on/${edit.apiPath}/*`);
const proxyUrlLabel = computed(() => `Will proxy to ${edit.proxyUrl}/*`);

async function refreshPluginFromManifest() {
  const plugin: Partial<IPlugin & { hardReset: boolean }> = { hardReset: true, manifestUrl: edit.manifestUrl };
  try {
    const res = await fetch(edit.manifestUrl, {
      mode: 'cors',
    })
    const str = await res.text();
    const data = JSON.parse(str);

    plugin.name = data.name;
    plugin.apiPath = edit.apiPath || data.apiPath;
    plugin.proxyUrl = data.proxyUrl;
  } catch {
    //
  }
  emit('submitted', plugin);
}

function addMoreMicroFrontend() {
  if (!edit.microFrontends) edit.microFrontends = [];
  edit.microFrontends.push({
    name: '',
    description: '',
    active: true,
    opened: true,
    url: '',
    roles: ['*'],
    workspaceRoles: ['*']
  })
}

function addMoreInjectable() {
  if (!edit.injectables) edit.injectables = [];
  edit.injectables.push({ name: '', description: '', active: true, html: '<!--Custom HTML-->' });
}

const submit = () => emit('submitted', edit);
</script>
<style scoped>
.content {
  padding: 10px;
}

.fast-refresh-manifest {
  border-radius: 5px;
  border: 1px solid var(--border-color);
  padding: 10px;
  margin: 10px;
}

.refresh-manifest {
  text-align: center;
  font-size: 36px;
}

.sub-item:after {
  content: '  ';
  display: block;
  width: 50%;
  border-block-end: 1px solid var(--border-color);
  margin-inline: auto;
  margin-block-end: 10px;
}

.remove-row {
  margin-bottom: 18px;
}
</style>
