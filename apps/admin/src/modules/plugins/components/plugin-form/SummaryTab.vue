<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
          <span>{{ $t('Plugin JSON') }}</span>
        </div>
      </template>
      <div class="monaco-container">
        <Monaco ref="editor" :model-value="pluginJson" @change="updateJson" language="json" class="monaco-editor"/>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

const emit = defineEmits<{
  (e: 'updateJson', value: string): void;
}>();

const editor = ref<InstanceType<typeof Monaco> | null>(null);

const pluginJson = computed(() => {
  try {
    return JSON.stringify(props.plugin, null, 2);
  } catch (e) {
    console.error('Failed to stringify plugin:', e);
    return '{}';
  }
});

watch(() => pluginJson.value, (newValue) => {
  if (editor.value && editor.value.getMonaco) {
    const currentValue = editor.value.getMonaco().getValue();
    if (currentValue !== newValue) {
      editor.value.getMonaco().setValue(newValue);
    }
  }
});

function updateJson(value: string) {
  emit('updateJson', value);
}
</script>
