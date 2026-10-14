<script lang="ts" setup>
import { ref } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlocksSelector from '@/modules/blocks/components/BlocksSelector.vue';
import ConfigCard from '../ConfigCard.vue';

const backgroundImage = defineModel<string>('backgroundImage');
const verticalBackgroundImage = defineModel<string>('verticalBackgroundImage');
const loginTitle = defineModel<string>('loginTitle');
const slots = defineModel<Record<string, any>>('slots', { required: true });

const props = defineProps<{ formPosition?: string }>();

const tab = ref<'content' | 'horizontal' | 'vertical'>('content');
const hasAside = () => props.formPosition === 'left' || props.formPosition === 'right';
</script>

<template>
  <ConfigCard id="auth-look" :title="$t('Login Page Appearance')" :description="$t('The text, content boxes and background around the form.')">
    <el-segmented
      v-model="tab"
      class="tabs"
      :options="[
        { label: $t('Login Content'), value: 'content' },
        { label: $t('Main Background'), value: 'horizontal' },
        { label: $t('Vertical Background'), value: 'vertical' },
      ]"
      :aria-label="$t('Login Page Appearance')"
    />

    <template v-if="tab === 'content'">
      <FormInput v-model="loginTitle" :disabled="!!slots?.loginHeader" title="Title of Login Page" :placeholder="$t('Welcome')">
        <template #help>
          <span class="help" v-if="!!slots?.loginHeader">{{ $t('Disabled because a custom header is selected') }}</span>
          <span class="help" v-else>{{ $t('The main heading displayed on your login page') }}</span>
        </template>
      </FormInput>

      <div class="boxes">
        <BlocksSelector v-model="slots.loginHeader" editable title="Header Content Box">
          <template #help><span class="help">{{ $t('Custom content to display at the top of the login form') }}</span></template>
        </BlocksSelector>
        <BlocksSelector v-model="slots.loginFooter" editable title="Footer Content Box">
          <template #help><span class="help">{{ $t('Custom content to display at the bottom of the login form') }}</span></template>
        </BlocksSelector>
        <BlocksSelector v-if="hasAside()" v-model="slots.loginAside" editable title="Aside Content Box">
          <template #help><span class="help">{{ $t('Custom content to display on the opposite side of the login form (when form is positioned left or right)') }}</span></template>
        </BlocksSelector>
      </div>
    </template>

    <template v-else-if="tab === 'horizontal'">
      <div class="preview wide" :style="{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }">
        <span v-if="!backgroundImage" class="none"><font-awesome-icon :icon="['fas', 'image']" /> {{ $t('No image selected') }}</span>
        <el-button v-else class="remove" circle size="small" :aria-label="$t('Remove image')" @click="backgroundImage = ''"><font-awesome-icon :icon="['fas', 'trash']" /></el-button>
      </div>
      <p class="help">{{ $t('Used for desktop and landscape views') }}</p>
      <FormInput v-model="backgroundImage" title="Background Image" type="upload">
        <template #help><span class="help">{{ $t('Add a background image to enhance your login page') }}</span></template>
      </FormInput>
      <FormInput v-model="backgroundImage" title="Background Image URL" type="url" />
    </template>

    <template v-else>
      <div class="preview tall" :style="{ backgroundImage: verticalBackgroundImage ? `url(${verticalBackgroundImage})` : 'none' }">
        <span v-if="!verticalBackgroundImage" class="none"><font-awesome-icon :icon="['fas', 'mobile-screen']" /> {{ $t('No image selected') }}</span>
        <el-button v-else class="remove" circle size="small" :aria-label="$t('Remove image')" @click="verticalBackgroundImage = ''"><font-awesome-icon :icon="['fas', 'trash']" /></el-button>
      </div>
      <p class="help">{{ $t('Used for mobile and portrait views') }}</p>
      <FormInput v-model="verticalBackgroundImage" title="Vertical Background Image" type="upload">
        <template #help><span class="help">{{ $t('Add a vertical background image optimized for mobile devices') }}</span></template>
      </FormInput>
      <FormInput v-model="verticalBackgroundImage" title="Vertical Background Image URL" type="url" />
    </template>
  </ConfigCard>
</template>

<style scoped lang="scss">
.tabs {
  align-self: flex-start;
  max-inline-size: 100%;
  overflow-x: auto;
}

.help {
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-align: start;
}

.boxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0 16px;
}

.preview {
  position: relative;
  display: grid;
  place-items: center;
  background: var(--el-fill-color-light) center / cover no-repeat;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  color: var(--el-text-color-secondary);

  &.wide {
    aspect-ratio: 16 / 7;
    max-block-size: 220px;
  }

  &.tall {
    aspect-ratio: 9 / 14;
    max-block-size: 260px;
    max-inline-size: 170px;
  }
}

.remove {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 8px;
}
</style>
