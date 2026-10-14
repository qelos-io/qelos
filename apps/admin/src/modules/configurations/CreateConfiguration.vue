<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import configurationsService from '@/services/apis/configurations-service';
import { useSubmitting } from '../core/compositions/submitting';
import Monaco from '../users/components/Monaco.vue';
import type { ICustomConfiguration } from '@qelos/sdk/src/administrator/manage-configurations';

const router = useRouter();

const configKey = ref('');
const configKind = ref('');
const isPublic = ref(false);
const metadata = ref('{\n  \n}');
const touched = ref(false);

const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const keyError = computed(() => (!touched.value ? '' : !configKey.value.trim() ? 'A key is required' : !KEY_PATTERN.test(configKey.value.trim()) ? 'Use letters, numbers, dots, dashes and underscores only' : ''));
const jsonError = computed(() => {
  try {
    const parsed = JSON.parse(metadata.value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? '' : 'Expected a JSON object';
  } catch (error: any) {
    return error.message as string;
  }
});

function format() {
  try {
    metadata.value = JSON.stringify(JSON.parse(metadata.value || '{}'), null, 2);
  } catch {
    // the error is already shown
  }
}

const { submitting, submit } = useSubmitting(
  () =>
    configurationsService.create({
      public: isPublic.value,
      key: configKey.value.trim(),
      kind: configKind.value.trim(),
      metadata: JSON.parse(metadata.value || '{}'),
    }),
  { success: 'Configurations created successfully', error: 'Failed to created configurations' },
  (config: ICustomConfiguration) => router.push({ name: 'editConfiguration', params: { key: config.key } }),
);

function create() {
  touched.value = true;
  if (keyError.value || jsonError.value || !configKey.value.trim()) return;
  submit();
}
</script>

<template>
  <div class="create">
    <header class="head">
      <el-button text class="back" :aria-label="$t('Back to settings')" @click="router.push({ name: 'configurations' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
        <span class="back-label">{{ $t('Settings') }}</span>
      </el-button>
      <div>
        <h1>{{ $t('New custom configuration') }}</h1>
        <p>{{ $t('A named set of values your application or plugins can read. Public ones are readable without signing in.') }}</p>
      </div>
    </header>

    <el-form class="form" label-position="top" @submit.prevent="create">
      <div class="row">
        <el-form-item :label="$t('Key')" :error="keyError ? $t(keyError) : ''" required>
          <el-input v-model="configKey" dir="ltr" placeholder="my-configuration" @blur="touched = true" />
        </el-form-item>
        <el-form-item :label="$t('Kind')">
          <el-input v-model="configKind" dir="ltr" placeholder="optional" />
        </el-form-item>
        <el-form-item :label="$t('Public')">
          <el-switch v-model="isPublic" :active-text="$t('Public')" :inactive-text="$t('Private')" />
        </el-form-item>
      </div>

      <el-form-item :label="$t('Values (JSON)')">
        <div class="editor">
          <Monaco v-model="metadata" language="json" />
          <el-button text type="primary" native-type="button" class="format" @click="format">{{ $t('Format JSON') }}</el-button>
          <el-alert v-if="jsonError" type="error" show-icon :closable="false" :title="$t('This JSON is not valid')" :description="jsonError" />
        </div>
      </el-form-item>

      <div class="actions">
        <el-button @click="router.push({ name: 'configurations' })">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" native-type="submit" :loading="submitting">{{ $t('Create configuration') }}</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.create {
  padding: 16px 20px 32px;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.back {
  flex: none;
  margin-inline-start: -8px;
  gap: 4px;
}

.form {
  margin-block-start: 16px;
}

.row {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  align-items: start;
  gap: 0 16px;
}

.editor {
  inline-size: 100%;
}

.format {
  margin-block-end: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 639px) {
  .create {
    padding: 12px;
  }

  .back-label {
    display: none;
  }

  .row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
