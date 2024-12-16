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
      <el-tabs>
        <el-tab-pane :label="$t('Basic Information')">
          <FormRowGroup>
            <FormInput title="Name" v-model="edit.name" required/>
            <FormInput title="Description" v-model="edit.description"/>
          </FormRowGroup>
        </el-tab-pane>
        <el-tab-pane :label="$t('APIs')">
          <FormRowGroup>
            <FormInput title="API Path" :label="apiPathLabel" v-model="edit.apiPath"/>
            <FormInput title="Proxy URL" :label="proxyUrlLabel" v-model="edit.proxyUrl"/>
          </FormRowGroup>
          <FormInput title="Manual Token" label="Qelos will use this token as Bearer token. Leave empty to keep previous value" v-model="edit.token"/>
        </el-tab-pane>
        <el-tab-pane :label="$t('Hooks & Events')">
          <p>{{$t('The ability to subscribe to system and custom events using web hooks.')}}</p>
          <div v-for="(event, index) in edit.subscribedEvents" class="sub-item" :key="index">
            <FormRowGroup>
              <el-form-item>
                <template #label>
                  {{ $t('Source') }}
                  <InfoIcon content="Plugin events will have a prefix of 'plugin:' before their custom event names"/>
                </template>
                <el-select
                    v-model="event.source"
                    filterable
                    allow-create
                    default-first-option
                    :reserve-keyword="false"
                    :placeholder="$t('*')"
                >
                  <el-option :label="$t('(*) All')" value="*"/>
                  <el-option :label="$t('Authentication')" value="auth"/>
                  <el-option :label="$t('Assets')" value="assets"/>
                  <el-option :label="$t('Blueprints')" value="blueprints"/>
                </el-select>
              </el-form-item>
              <template v-if="event.source === 'blueprints'">
                <BlueprintSelector title="Kind" v-model="event.kind"/>
                <el-form-item :label="$t('Event Name')">
                  <el-select v-model="event.eventName">
                    <el-option :label="$t('Create')" value="create"/>
                    <el-option :label="$t('Update')" value="update"/>
                    <el-option :label="$t('Delete')" value="delete"/>
                  </el-select>
                </el-form-item>
              </template>
              <template v-else>
                <FormInput title="Kind" v-model="event.kind" :placeholder="$t('(*) All')"/>
                <FormInput title="Event Name" v-model="event.eventName" :placeholder="$t('(*) All')"/>
              </template>
            </FormRowGroup>
            <FormRowGroup>
              <FormInput title="Webhook URL" type="url" v-model="event.hookUrl" required placeholder="https://..."/>
              <div class="flex-0 remove-row">
                <RemoveButton @click="edit.subscribedEvents.splice(index, 1)"/>
              </div>
            </FormRowGroup>
          </div>
          <AddMore @click="edit.subscribedEvents.push({source: '', kind: '', eventName: '', hookUrl: ''})"/>
        </el-tab-pane>
        <el-tab-pane :label="$t('CRUDs')">
          Soon
        </el-tab-pane>
        <el-tab-pane :label="$t('Micro-Frontends')">
          <EditPluginMicroFrontends/>
        </el-tab-pane>
        <el-tab-pane :label="$t('Injectables')">
          <p>{{$t('The ability to inject any custom HTML / CSS / JS to all the pages.')}}</p>
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
        </el-tab-pane>
        <el-tab-pane :label="$t('Summary')">
          <Monaco ref="editor" :model-value="pluginJson" @change="pluginJson = editor.getMonaco().getValue()"
                  language="json"/>
        </el-tab-pane>
      </el-tabs>
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
import EditPluginMicroFrontends from '@/modules/plugins/components/EditPluginMicroFrontends.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';

const props = defineProps({
  plugin: Object as PropType<Partial<IPlugin>>,
  submitting: Boolean
});

provide('submitting', toRef(props, 'submitting'))
const editor = ref()
const emit = defineEmits(['submitted']);

const edit = reactive<Partial<IPlugin>>({ ...props.plugin as Partial<IPlugin> });
provide('edit', edit);

const pluginJson = computed({
  get: () => JSON.stringify({ ...edit, injectables: edit.injectables, microFrontends: edit.microFrontends }, null, 2),
  set: (value: string) => {
    try {
      Object.assign(edit, JSON.parse(value));
    } catch (err) {
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
