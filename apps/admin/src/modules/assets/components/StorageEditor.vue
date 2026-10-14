<template>
  <form class="storage-editor" novalidate @submit.prevent="submit(false)">
    <header class="editor-head">
      <router-link class="back-link" :to="{ name: 'storageList' }">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
        {{ $t('Storage') }}
      </router-link>
      <h1>
        <template v-if="isEdit">{{ storage.name }}</template>
        <template v-else>{{ $t('Add storage') }}</template>
      </h1>
    </header>

    <div class="editor-grid">
      <div class="editor-main">
        <section class="editor-section">
          <h2>{{ $t('Storage Provider') }}</h2>
          <StorageProviderPicker v-model="form.kind" :disabled="isEdit" />
          <p v-if="isEdit" class="section-note">
            {{ $t("The provider can't be changed. Create a new storage to use a different one.") }}
          </p>
        </section>

        <section class="editor-section">
          <h2>{{ $t('Details') }}</h2>
          <FormInput v-model="form.name" title="Name" required :placeholder="$t('Enter storage name')" />
          <el-checkbox v-model="form.isDefault">
            {{ $t('Set as Default Storage') }}
          </el-checkbox>
          <p class="section-note">{{ $t('When checked, this storage will be used as the default for all new assets') }}</p>
        </section>

        <section class="editor-section">
          <h2>{{ $t('Location') }}</h2>
          <div class="field-row">
            <FormInput v-model="form.metadata.publicUrl" title="Public URL" placeholder="https://your-public-url.com" />
            <FormInput v-model="form.metadata.basePath" title="Base Storage Path" placeholder="/" />
          </div>
          <FormInput
            v-if="provider?.containerLabel"
            v-model="form.metadata.bucketName"
            :title="provider.containerLabel"
            :placeholder="form.kind === 'cloudinary' ? 'your-cloud-name' : 'your-bucket-name'"
          />
          <div v-if="form.kind === 's3'" class="field-row">
            <FormInput
              v-model="form.metadata.bucketUrl"
              title="Bucket URL"
              label="The URL of your storage bucket. Optional"
              placeholder="https://your-bucket-url.com"
            />
            <FormInput
              v-model="form.metadata.signatureVersion"
              title="Signature Version"
              label="The signature version of your storage bucket. Optional"
              placeholder="v4"
            />
          </div>
        </section>

        <section class="editor-section">
          <h2>{{ $t('Authentication Secrets') }}</h2>
          <p class="section-note">{{ $t('These credentials will be securely stored and used to connect to your storage provider.') }}</p>

          <div v-if="isEdit && !replacing" class="credentials-saved">
            <span>{{ $t("Credentials are encrypted and can't be displayed.") }}</span>
            <el-button size="small" @click="replacing = true">{{ $t('Replace credentials') }}</el-button>
          </div>

          <template v-else>
            <StorageFtpAuth v-if="form.kind === 'ftp'" :key="`ftp-${authKey}`" v-model="authentication" />
            <StorageGcsAuth v-else-if="form.kind === 'gcs'" :key="`gcs-${authKey}`" v-model="authentication" />
            <StorageS3Auth v-else-if="form.kind === 's3'" :key="`s3-${authKey}`" v-model="authentication" />
            <StorageCloudinaryAuth v-else-if="form.kind === 'cloudinary'" :key="`cl-${authKey}`" v-model="authentication" />
            <el-button v-if="isEdit" size="small" text @click="cancelReplace">{{ $t('Keep the saved credentials') }}</el-button>
          </template>
        </section>

        <el-alert v-if="errors.length" type="error" show-icon :closable="false" class="editor-errors" role="alert">
          <template #title>{{ $t('Please complete the following') }}</template>
          <ul>
            <li v-for="message in errors" :key="message">{{ message }}</li>
          </ul>
        </el-alert>
      </div>

      <aside class="editor-aside">
        <slot name="aside" :kind="form.kind" :dirty="dirty" />
      </aside>
    </div>

    <div class="editor-actions">
      <el-button native-type="button" @click="router.push({ name: 'storageList' })">{{ $t('Cancel') }}</el-button>
      <el-button v-if="!isEdit" native-type="submit" :loading="submitting && !testAfter">{{ $t('Save') }}</el-button>
      <el-button
        v-if="!isEdit"
        type="primary"
        native-type="button"
        :loading="submitting && testAfter"
        @click="submit(true)"
      >
        {{ $t('Save & test connection') }}
      </el-button>
      <el-button v-else type="primary" native-type="submit" :loading="submitting" :disabled="!dirty">
        {{ $t('Save') }}
      </el-button>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import FormInput from '../../core/components/forms/FormInput.vue';
import StorageProviderPicker from './StorageProviderPicker.vue';
import StorageFtpAuth from './StorageFtpAuth.vue';
import StorageGcsAuth from './StorageGcsAuth.vue';
import StorageS3Auth from './StorageS3Auth.vue';
import StorageCloudinaryAuth from './StorageCloudinaryAuth.vue';
import { getMissingCredentials, getStorageProvider } from '../services/storage-providers';
import type { IStorage } from '@/services/types/storage';

const props = defineProps<{
  storage?: IStorage | null;
  initialKind?: string;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submitted', payload: Record<string, any>, options: { test: boolean }): void;
}>();

const router = useRouter();
const { t } = useI18n();

const isEdit = computed(() => !!props.storage?._id);

const form = reactive({
  name: props.storage?.name ?? '',
  kind: props.storage?.kind ?? (getStorageProvider(props.initialKind) ? props.initialKind! : 's3'),
  isDefault: !!props.storage?.isDefault,
  metadata: {
    publicUrl: '',
    basePath: '/',
    bucketName: '',
    bucketUrl: '',
    signatureVersion: '',
    ...(props.storage?.metadata ?? {}),
  } as Record<string, string>,
});

const authentication = ref<Record<string, any> | null>(null);
const replacing = ref(!isEdit.value);
const authKey = ref(0);
const errors = ref<string[]>([]);
const testAfter = ref(false);
const provider = computed(() => getStorageProvider(form.kind));

const snapshot = () => JSON.stringify({ name: form.name, isDefault: form.isDefault, metadata: form.metadata });
const baseline = ref(snapshot());
const dirty = computed(() => (isEdit.value ? snapshot() !== baseline.value || (replacing.value && !!authentication.value) : true));

// after a successful save the page updates `storage`: that is the new baseline
watch(
  () => props.storage,
  () => {
    baseline.value = snapshot();
    replacing.value = false;
    authentication.value = null;
    authKey.value++;
  },
  { deep: true },
);

watch(
  () => form.kind,
  () => {
    if (!isEdit.value) {
      authentication.value = null;
      authKey.value++;
      errors.value = [];
    }
  },
);

function cancelReplace() {
  replacing.value = false;
  authentication.value = null;
}

function validate() {
  const messages: string[] = [];
  if (!form.name.trim()) {
    messages.push(t('Name is required'));
  }
  if (replacing.value) {
    for (const label of getMissingCredentials(form.kind, authentication.value)) {
      messages.push(`${t(label)} ${t('is required')}`);
    }
  }
  errors.value = messages;
  return !messages.length;
}

function submit(test: boolean) {
  if (!validate()) return;
  testAfter.value = test;

  const metadata: Record<string, string> = { ...form.metadata };
  if (form.kind !== 's3') {
    delete metadata.bucketUrl;
    delete metadata.signatureVersion;
  }
  if (!provider.value?.containerLabel) {
    delete metadata.bucketName;
  }

  const payload: Record<string, any> = {
    name: form.name.trim(),
    kind: form.kind,
    isDefault: form.isDefault,
    metadata,
  };
  if (replacing.value) {
    payload.authentication = authentication.value;
  }
  emit('submitted', payload, { test });
}
</script>

<style scoped lang="scss">
.storage-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  padding-block-end: 0;
}

.editor-head {
  display: flex;
  flex-direction: column;
  gap: 6px;

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  font-size: 13px;
  text-decoration: none;
  color: var(--el-text-color-secondary);

  &:hover {
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
  gap: 24px;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-inline-size: 0;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);

  h2 {
    margin: 0;
    font-size: 16px;
  }
}

.section-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.credentials-saved {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  font-size: 14px;
}

.editor-errors ul {
  margin: 4px 0 0;
  padding-inline-start: 18px;
}

.editor-aside {
  position: sticky;
  inset-block-start: 16px;
}

.editor-actions {
  position: sticky;
  inset-block-end: 0;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-inline: -20px;
  padding: 14px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 1100px) {
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-aside {
    position: static;
    order: -1;
  }
}

@media (max-width: 768px) {
  .storage-editor {
    padding: 12px;
    padding-block-end: 0;
  }

  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-actions {
    margin-inline: -12px;
    padding-inline: 12px;
  }

  .editor-actions .el-button {
    flex: 1;
  }
}
</style>
