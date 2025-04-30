<script setup lang="ts">
import QuickReverseProxyForm from './quick-plugin/QuickReverseProxyForm.vue';
import { ref, watch } from 'vue';
import { useCreatePlugin } from '@/modules/plugins/compositions/manage-plugin';

const visible = defineModel<boolean>('visible')
const emit = defineEmits(['close', 'saved'])

const { savePlugin, submitting, plugin } = useCreatePlugin();

const form = ref({});

const selectedOption = ref()

async function submit() {
  Object.assign(plugin, form.value)
  await savePlugin(plugin);
  emit('saved', plugin)
  emit('close')
}

watch(visible, () => {
  if (visible.value) {
    selectedOption.value = undefined
  }
})
</script>

<template>
  <el-dialog v-model="visible"
             :title="$t('Create a Plugin')"
             width="50%"
             @close="$emit('close')">
    <el-form v-if="visible" @submit.prevent="submit">

      <div v-if="!selectedOption">
        <h3>{{ $t('What is your purpose?') }}</h3>

        <div class="content-list">
          <div class="content-item" @click="selectedOption = 'reverse-proxy'">
            <font-awesome-icon :icon="['fas', 'network-wired']" />
            <span>{{ $t('Reverse Proxy') }}</span>
          </div>
          <div class="content-item" @click="selectedOption = 'analytics'">
            <font-awesome-icon :icon="['fas', 'chart-simple']" />
            <span>{{ $t('Analytics script') }}</span>
          </div>
          <div class="content-item" @click="selectedOption = 'subscribe'">
            <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
            <span>{{ $t('Subscribe to Events') }}</span>
          </div>
          <div class="content-item" @click="selectedOption = 'remote'">
            <font-awesome-icon :icon="['fas', 'link']" />
            <span>{{ $t('Link to Remote Plugin') }}</span>
          </div>
          <router-link is="div" class="content-item" :to="{name: 'createPlugin'}">
            <font-awesome-icon :icon="['fas', 'chalkboard-user']" />
            <span>{{ $t('Manual') }}</span>
          </router-link>
        </div>
      </div>

      <div v-else-if="selectedOption === 'reverse-proxy'">
        <QuickReverseProxyForm @changed="form = $event"/>
      </div>

      <el-form-item v-if="selectedOption">
        <el-button type="primary" native-type="submit" :disabled="submitting" :loading="submitting">{{ $t('Save') }}</el-button>
        <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
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
</style>