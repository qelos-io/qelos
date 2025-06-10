<script setup lang="ts">
import QuickReverseProxyForm from './quick-plugin/QuickReverseProxyForm.vue';
import QuickInjectableForm from './quick-plugin/QuickInjectableForm.vue';
import { ref, watch } from 'vue';
import { useCreatePlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useRoute, useRouter } from 'vue-router';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IPlugin } from '@/services/types/plugin';

const router = useRouter();
const route = useRoute();
const visible = defineModel<boolean>('visible')
const emit = defineEmits(['close', 'saved'])

const { savePlugin, submitting } = useCreatePlugin();

const form = ref({});

function selectOption(option: string) {
  router.push({query: {...route.query, option}})
}

async function submit() {
  // For remote plugin, fetch the manifest and create the plugin
  if (route.query.option === 'remote' && form.value.manifestUrl) {
    const plugin: Partial<IPlugin & { hardReset: boolean }> = { hardReset: true, manifestUrl: form.value.manifestUrl };
    try {
      const res = await fetch(form.value.manifestUrl, {
        mode: 'cors',
      })
      const str = await res.text();
      const data = JSON.parse(str);

      plugin.name = data.name;
      plugin.apiPath = data.apiPath;
      plugin.proxyUrl = data.proxyUrl;
      
      await savePlugin(plugin);
      emit('saved', plugin);
      emit('close');
      return;
    } catch (error) {
      console.error('Error loading plugin manifest:', error);
      return;
    }
  }
  
  // For other plugin types
  await savePlugin(form.value);
  emit('saved', form.value);
  emit('close');
}

watch(visible, () => {
  if (visible.value) {
    form.value = {};
    router.push({query: {...route.query, option: undefined}})
  }
})
</script>

<template>
<el-form v-if="visible" @submit.prevent="submit">
  <el-dialog v-model="visible"
             :title="$t('Create a Plugin')"
             @close="$emit('close')">
    <div v-if="!route.query.option">
        <h3>{{ $t('What is your purpose?') }}</h3>

        <div class="content-list">
          <div class="content-item" @click="selectOption('reverse-proxy')">
            <font-awesome-icon :icon="['fas', 'network-wired']" />
            <span>{{ $t('Reverse Proxy') }}</span>
          </div>
          <div class="content-item" @click="selectOption('analytics')">
            <font-awesome-icon :icon="['fas', 'chart-simple']" />
            <span>{{ $t('Analytics script') }}</span>
          </div>
          <div class="content-item" @click="selectOption('subscribe')">
            <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
            <span>{{ $t('Subscribe to Events') }}</span>
          </div>
          <div class="content-item" @click="selectOption('remote')">
            <font-awesome-icon :icon="['fas', 'link']" />
            <span>{{ $t('Link to Remote Plugin') }}</span>
          </div>
          <router-link is="div" class="content-item" :to="{name: 'createPlugin'}">
            <font-awesome-icon :icon="['fas', 'chalkboard-user']" />
            <span>{{ $t('Manual') }}</span>
          </router-link>
        </div>
      </div>

      <div v-else-if="route.query.option === 'reverse-proxy'">
        <QuickReverseProxyForm @changed="form = $event"/>
      </div>
      <div v-else-if="route.query.option === 'analytics'">
        <QuickInjectableForm @changed="form = $event"/>
      </div>
      <div v-else-if="route.query.option === 'remote'">
        <FormRowGroup>
          <FormInput title="Manifest URL" label="required" v-model="form.manifestUrl" placeholder="https://example.com/manifest.json"/>
        </FormRowGroup>
      </div>

      <template #footer>
        <el-form-item>
          <el-button v-if="route.query.option" type="primary" native-type="submit" :disabled="submitting" :loading="submitting">{{ $t('Save') }}</el-button>
          <el-button @click="$emit('close')">{{ $t(route.query.option ? 'Cancel' : 'Close') }}</el-button>
        </el-form-item>
      </template>
  </el-dialog>
</el-form>
</template>

<style scoped>
.tag {
  margin: 5px;
  cursor: pointer;
}
img {
  border-radius: 0;
  height: 20px;
  margin: 0;
}

img, small {
  margin-inline-end: 10px;
  font-weight: bold;
  font-style: italic;
}

.content-item {
  margin: 10px;
  padding: 10px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  cursor: pointer;
  min-width: 200px;
  width: 30%;
  height: 200px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  
  &:hover {
    background-color: var(--third-color);
  }
}

.fast-refresh-manifest {
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  padding: 10px;
  margin: 10px;
}
</style>