<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePluginsList } from '../../store/plugins-list';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import type { IMicroFrontend, IPlugin } from '@/services/types/plugin';
import { collectNavGroups, mfeKind, mfeSource, switchMfeKind } from '../../services/plugin-effects';

const props = defineProps<{ mfe: IMicroFrontend; plugin: Partial<IPlugin> }>();
const open = defineModel<boolean>({ default: false });

const { t } = useI18n();
const list = usePluginsList();

const kind = computed({
  get: () => (mfeKind(props.mfe) === 'unplaced' ? 'page' : (mfeKind(props.mfe) as 'page' | 'component' | 'modal')),
  set: (value) => switchMfeKind(props.mfe, value),
});

const source = computed({
  get: () => (mfeSource(props.mfe) === 'url' ? 'url' : 'template'),
  set: (value: 'template' | 'url') => {
    if (value === 'url') {
      props.mfe.use = '';
      props.mfe.url ||= 'https://';
    } else {
      props.mfe.url = '';
      props.mfe.use ||= 'plain';
    }
  },
});

const groups = computed(() => collectNavGroups(list.plugins || [], props.plugin as IPlugin));
const templates = [
  { value: 'plain', label: 'Blank page', hint: 'Start empty and add components or HTML' },
  { value: 'basic-form', label: 'Form', hint: 'A form that saves data' },
  { value: 'rows-list', label: 'List', hint: 'A table of rows' },
];
</script>

<template>
  <el-drawer v-model="open" :title="mfe.name || $t('Untitled')" direction="rtl" size="min(520px, 100%)" append-to-body destroy-on-close>
    <el-form label-position="top" class="form" @submit.prevent>
      <section>
        <h3>{{ $t('Basics') }}</h3>
        <FormInput v-model="mfe.name" :title="$t('Name')" required />
        <FormInput v-model="mfe.description" :title="$t('Description')" />
        <el-form-item :label="$t('Active')">
          <el-switch v-model="mfe.active" />
          <span class="hint">{{ mfe.active ? $t('Visible to the people allowed below') : $t('Hidden from everyone') }}</span>
        </el-form-item>
      </section>

      <section>
        <h3>{{ $t('Where it appears') }}</h3>
        <el-radio-group v-model="kind" class="segment">
          <el-radio-button value="page">{{ $t('Page') }}</el-radio-button>
          <el-radio-button value="component">{{ $t('Component') }}</el-radio-button>
          <el-radio-button value="modal">{{ $t('Modal') }}</el-radio-button>
        </el-radio-group>
        <p class="hint block">
          {{ kind === 'page' ? $t('A full page with its own address.') : kind === 'component' ? $t('A block shown inside other pages, in the position you name.') : $t('A dialog other pages can open by name.') }}
        </p>

        <template v-if="kind === 'page' && mfe.route">
          <FormInput v-model="mfe.route.path" :title="$t('Page address')" dir="ltr" placeholder="my-page" />
          <FormInput v-model="mfe.route.name" :title="$t('Route name')" dir="ltr" />
          <el-form-item :label="$t('Link in the app navigation')">
            <el-radio-group v-model="mfe.route.navBarPosition" class="segment">
              <el-radio-button :value="false">{{ $t('No link') }}</el-radio-button>
              <el-radio-button value="top">{{ $t('Top') }}</el-radio-button>
              <el-radio-button value="bottom">{{ $t('Bottom') }}</el-radio-button>
              <el-radio-button value="user-dropdown">{{ $t('User menu') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="mfe.route.navBarPosition" :label="$t('Navigation group')">
            <el-select v-model="mfe.route.group" clearable :placeholder="$t('No group')">
              <el-option v-for="g in groups" :key="g.key" :value="g.key" :label="g.own ? g.name : `${g.name} (${g.pluginName})`" />
            </el-select>
          </el-form-item>
        </template>
        <FormInput v-else-if="kind === 'component' && mfe.global" v-model="mfe.global.position" :title="$t('Position')" dir="ltr" />
        <template v-else-if="kind === 'modal' && mfe.modal">
          <FormInput v-model="mfe.modal.name" :title="$t('Modal name')" dir="ltr" />
          <el-form-item :label="$t('Size')">
            <el-radio-group v-model="mfe.modal.size" class="segment">
              <el-radio-button value="sm">{{ $t('Small') }}</el-radio-button>
              <el-radio-button value="md">{{ $t('Medium') }}</el-radio-button>
              <el-radio-button value="lg">{{ $t('Large') }}</el-radio-button>
              <el-radio-button value="full">{{ $t('Full screen') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>
      </section>

      <section>
        <h3>{{ $t('What it shows') }}</h3>
        <el-radio-group v-model="source" class="segment">
          <el-radio-button value="template">{{ $t('Built in Qelos') }}</el-radio-button>
          <el-radio-button value="url">{{ $t('External app (iframe)') }}</el-radio-button>
        </el-radio-group>
        <div v-if="source === 'template'" class="templates" role="radiogroup" :aria-label="$t('Starting template')">
          <button v-for="tpl in templates" :key="tpl.value" type="button" role="radio" :aria-checked="mfe.use === tpl.value" class="tpl" :class="{ on: mfe.use === tpl.value }" @click="mfe.use = tpl.value">
            <strong>{{ $t(tpl.label) }}</strong>
            <span>{{ $t(tpl.hint) }}</span>
          </button>
          <p class="hint block">{{ $t('You design the content on the page itself, with "Edit page".') }}</p>
        </div>
        <FormInput v-else v-model="mfe.url" :title="$t('App URL')" type="url" dir="ltr" placeholder="https://your-app.com" />
      </section>

      <section>
        <h3>{{ $t('Who can see it') }}</h3>
        <el-form-item :label="$t('Guests (not signed in)')">
          <el-switch v-model="mfe.guest" />
          <span class="hint">{{ mfe.guest ? $t('Anyone with the link') : $t('Signed-in users only') }}</span>
        </el-form-item>
        <template v-if="!mfe.guest">
          <LabelsInput v-model="mfe.roles" :title="$t('User roles')" :placeholder="$t('Everyone if empty')" />
          <LabelsInput v-model="mfe.workspaceRoles" :title="$t('Workspace roles')" />
          <LabelsInput v-model="mfe.workspaceLabels" :title="$t('Workspace labels')" />
        </template>
      </section>
    </el-form>
    <template #footer>
      <p class="footer-note">{{ $t('Changes apply when you save the plugin.') }}</p>
      <el-button type="primary" @click="open = false">{{ $t('Done') }}</el-button>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

h3 {
  margin: 0 0 6px;
  padding: 0;
  font-size: 1rem;
}

.segment {
  max-inline-size: 100%;
  flex-wrap: wrap;
}

.hint {
  margin-inline-start: 10px;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.hint.block {
  display: block;
  margin: 4px 0 8px;
  text-align: start;
}

.templates {
  display: grid;
  gap: 8px;
  margin-block-start: 10px;
}

.tpl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
  }

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.footer-note {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}
</style>
