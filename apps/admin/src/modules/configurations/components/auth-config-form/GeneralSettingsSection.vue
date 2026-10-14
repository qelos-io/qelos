<script lang="ts" setup>
import ConfigCard from '../ConfigCard.vue';
import SettingRow from '../SettingRow.vue';

const showLoginPage = defineModel<boolean>('showLoginPage', { required: true });
const showRegisterPage = defineModel<boolean>('showRegisterPage', { required: true });
const treatUsernameAs = defineModel<string>('treatUsernameAs', { required: true });
const formPosition = defineModel<string>('formPosition', { required: true });

const usernameOptions = [
  { value: 'email', label: 'Email', description: 'Users log in with email addresses', icon: ['fas', 'envelope'] },
  { value: 'username', label: 'Username', description: 'Users log in with custom usernames', icon: ['fas', 'user'] },
  { value: 'phone', label: 'Phone', description: 'Users log in with phone numbers', icon: ['fas', 'phone'] },
] as const;

const positions = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
] as const;
</script>

<template>
  <ConfigCard id="auth-general" :title="$t('Sign-in and registration')" :description="$t('Which pages exist and how people identify themselves.')">
    <SettingRow :title="$t('Show Login Page?')" :description="$t('Enable or disable the login page for your application')">
      <template #default="{ labelledBy }"><el-switch v-model="showLoginPage" :aria-labelledby="labelledBy" /></template>
    </SettingRow>

    <SettingRow :title="$t('Show Registration Page?')" :description="showRegisterPage ? $t('Registration is enabled - New users can create accounts') : $t('Registration is disabled - Only existing users can log in')">
      <template #default="{ labelledBy }"><el-switch v-model="showRegisterPage" :aria-labelledby="labelledBy" /></template>
    </SettingRow>

    <fieldset class="choice">
      <legend>{{ $t('Treat Username As') }}</legend>
      <p class="hint">{{ $t('Determines how username fields will be validated') }}</p>
      <div class="options">
        <label v-for="option in usernameOptions" :key="option.value" class="option" :class="{ active: treatUsernameAs === option.value }">
          <input v-model="treatUsernameAs" type="radio" name="username-type" :value="option.value" class="sr-only" />
          <font-awesome-icon :icon="option.icon as any" class="option-icon" aria-hidden="true" />
          <span class="option-text">
            <span class="option-title">{{ $t(option.label) }}</span>
            <span class="option-desc">{{ $t(option.description) }}</span>
          </span>
        </label>
      </div>
      <p class="hint">{{ $t('This affects validation rules and keyboard types on mobile devices') }}</p>
    </fieldset>

    <fieldset v-if="showLoginPage" class="choice">
      <legend>{{ $t('Form Position') }}</legend>
      <p class="hint">{{ $t('Where the login form sits next to the brand panel. The preview shows the result.') }}</p>
      <div class="positions">
        <label v-for="option in positions" :key="option.value" class="position" :class="{ active: formPosition === option.value }">
          <input v-model="formPosition" type="radio" name="form-position" :value="option.value" class="sr-only" />
          <span class="drawing" :class="`p-${option.value}`" aria-hidden="true"><i class="panel" /><i class="form" /></span>
          <span class="position-label">{{ $t(option.label) }}</span>
        </label>
      </div>
    </fieldset>
  </ConfigCard>
</template>

<style scoped lang="scss">
.choice {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    padding: 0;
    font-weight: 600;
  }
}

.hint {
  margin: 2px 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 0.84rem;
  text-align: start;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:has(:focus-visible) {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.option-icon {
  margin-block-start: 3px;
  color: var(--el-color-primary);
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-title {
  font-weight: 600;
}

.option-desc {
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-align: start;
}

.positions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 10px;
}

.position {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:has(:focus-visible) {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.position-label {
  font-size: 0.84rem;
  font-weight: 600;
}

// wireframes: the grey block is the brand panel, the outlined one is the form
.drawing {
  position: relative;
  display: block;
  inline-size: 100%;
  block-size: 46px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  overflow: hidden;

  i {
    position: absolute;
    display: block;
    border-radius: 3px;
  }

  .panel {
    background: var(--el-text-color-placeholder);
  }

  .form {
    border: 2px solid var(--el-color-primary);
    background: var(--el-bg-color);
  }

  &.p-left {
    .panel { inset: 4px 4px 4px 52%; }
    .form { inset: 4px 52% 4px 4px; }
  }

  &.p-right {
    .panel { inset: 4px 52% 4px 4px; }
    .form { inset: 4px 4px 4px 52%; }
  }

  &.p-center {
    .panel { inset: 0; border-radius: 0; opacity: 0.45; }
    .form { inset: 8px 28%; }
  }

  &.p-top {
    .panel { inset: 52% 4px 4px; }
    .form { inset: 4px 4px 52%; }
  }

  &.p-bottom {
    .panel { inset: 4px 4px 52%; }
    .form { inset: 52% 4px 4px; }
  }
}

[dir='rtl'] .drawing.p-left,
[dir='rtl'] .drawing.p-right {
  transform: scaleX(-1);
}

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
