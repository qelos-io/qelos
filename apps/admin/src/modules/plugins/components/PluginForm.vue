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
      <h2>{{ $t('Basic Information') }}</h2>
      <FormRowGroup>
        <FormInput title="Name" v-model="edit.name"/>
        <FormInput title="Description" v-model="edit.description"/>
      </FormRowGroup>
      <h2>{{ $t('APIs') }}</h2>
      <FormRowGroup>
        <FormInput title="API Path" :label="apiPathLabel" v-model="edit.apiPath"/>
        <FormInput title="Proxy URL" :label="proxyUrlLabel" v-model="edit.proxyUrl"/>
      </FormRowGroup>
      <h2>{{ $t('Hooks & Events') }}</h2>
      <h2>{{ $t('CRUDs') }}</h2>
      <h2>{{ $t('Micro-Frontends') }}</h2>
      <div v-for="(mfe, index) in edit.microFrontends" :key="index">
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
      </div>
      <AddMore
          @click="edit.microFrontends.push({ name: '', description: '', active: true, opened: true, url: '', roles: [], workspaceRoles: [] })"/>
      <h2>{{ $t('Injectables') }}</h2>
      <div v-for="(inject, index) in edit.injectables" :key="index">
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
      <h2>{{ $t('Summary') }}</h2>
      <Monaco v-model="pluginJson" language="json"/>

    </div>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, PropType, provide, reactive, toRef } from 'vue';
import { IPlugin } from '@/services/types/plugin';
import EditPluginHeader from './EditPluginHeader.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const props = defineProps({
  plugin: Object as PropType<Partial<IPlugin>>,
  submitting: Boolean
});

provide('submitting', toRef(props, 'submitting'))

const emit = defineEmits(['submitted']);

const edit = reactive<Partial<IPlugin>>({ ...props.plugin as Partial<IPlugin> });

const pluginJson = computed({
  get: () => JSON.stringify(edit, null, 2),
  set: (value: string) => {
    try {
      Object.assign(edit, JSON.parse(value));
    } catch {
      //
    }
  }
});

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

function addMoreInjectable() {
  if (!edit.injectables) edit.injectables = [];
  edit.injectables.push({ name: '', description: '', active: true, html: '<!--Custom HTML-->' });
}

const submit = () => alert('soon');
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

.remove-row {
  margin-bottom: 18px;
}
</style>
