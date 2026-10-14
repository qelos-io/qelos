<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, toRefs } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowDown, ArrowRight, Check, OfficeBuilding, User } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useToursStore } from '@/modules/core/store/tours';
import { useAppConfiguration, softResetConfiguration } from '@/modules/configurations/store/app-configuration';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import blueprintsService from '@/services/apis/blueprints-service';
import configurationsService from '@/services/apis/configurations-service';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { PALETTES } from '@/modules/core/utils/colors-palettes';
import { IntegrationSourceKind } from '@qelos/global-types';

type TaskId = 'name' | 'logo' | 'theme' | 'audience' | 'ai';
type TaskState = 'todo' | 'done' | 'skipped';

const { t } = useI18n();
const open = ref(false);
const saving = ref<TaskId | ''>('');
const current = ref<TaskId | ''>('name');

const appName = ref('');
const appLogo = ref('');
const selectedTheme = ref('');
const appType = ref<'b2b' | 'b2c'>('b2c');
const openAiToken = ref('');
const aiPurpose = ref('');
const createdBlueprints = ref<any[]>([]);

const state = reactive<Record<TaskId, TaskState>>({
  name: 'todo',
  logo: 'todo',
  theme: 'todo',
  audience: 'todo',
  ai: 'todo',
});

const themes = PALETTES.map((palette) => ({
  value: palette.name.toLowerCase().replace(/\s+/g, '-'),
  label: palette.name,
  description: palette.description,
  palette: palette.palette,
}));

const SHADOWS: Record<string, string> = {
  none: 'none',
  light: '0 2px 4px rgba(0,0,0,.12)',
  medium: '0 4px 8px rgba(0,0,0,.18)',
  heavy: '0 8px 16px rgba(0,0,0,.28)',
};

function isColorDark(hex: string) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// a miniature of the real UI, drawn with the palette's own values
function previewVars(palette: Record<string, any>) {
  const dark = isColorDark(palette.bgColor);
  return {
    '--pv-bg': palette.bgColor,
    '--pv-nav': palette.navigationBgColor,
    '--pv-nav-text': palette.secondaryColor,
    '--pv-nav-active': palette.thirdColor,
    '--pv-surface': palette.surfaceColor || (dark ? palette.negativeColor : '#ffffff'),
    '--pv-main': palette.mainColor,
    '--pv-text': palette.textColor,
    '--pv-border': palette.bordersColor,
    '--pv-btn': palette.mainColor,
    '--pv-btn-text': palette.buttonTextColor || '#ffffff',
    '--pv-radius': `${Math.min(palette.borderRadius ?? 6, 14)}px`,
    '--pv-btn-radius': `${Math.min(palette.buttonRadius ?? 6, 12)}px`,
    '--pv-shadow': SHADOWS[palette.shadowStyle] || 'none',
  };
}

function headingFont(palette: Record<string, any>) {
  return String(palette.headingsFontFamily || palette.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
}

const liveEdit = useLiveEditStore();
const toursStore = useToursStore();
const { appConfig, promise: appConfigPromise } = useAppConfiguration();
const wsConfig = useWsConfiguration();
const integrationSourcesStore = useIntegrationSourcesStore();
const { promise: integrationPromise, groupedSources } = toRefs(integrationSourcesStore);

const hasQelosIntegration = computed(() => groupedSources.value?.['qelos']?.length > 0);
const hasOpenAIIntegration = computed(() => groupedSources.value?.['openai']?.length > 0);

const tasks = computed(() => [
  { id: 'name' as TaskId, title: t('App name'), summary: appName.value, optional: false },
  { id: 'logo' as TaskId, title: t('Logo'), summary: appLogo.value ? t('Added') : '', optional: true },
  {
    id: 'theme' as TaskId,
    title: t('Theme'),
    summary: themes.find((theme) => theme.value === selectedTheme.value)?.label || '',
    optional: true,
  },
  { id: 'audience' as TaskId, title: t('Audience'), summary: appType.value.toUpperCase(), optional: false },
  {
    id: 'ai' as TaskId,
    title: t('AI & data model'),
    summary: createdBlueprints.value.length ? `${createdBlueprints.value.length} ${t('blueprints')}` : '',
    optional: true,
  },
]);

const doneCount = computed(() => Object.values(state).filter((value) => value !== 'todo').length);
const allSettled = computed(() => doneCount.value === tasks.value.length);
const progress = computed(() => Math.round((doneCount.value / tasks.value.length) * 100));

function nextTodo(after?: TaskId): TaskId | '' {
  const ids = tasks.value.map((task) => task.id);
  const start = after ? ids.indexOf(after) + 1 : 0;
  return [...ids.slice(start), ...ids.slice(0, start)].find((id) => state[id] === 'todo') ?? '';
}

function settle(id: TaskId, status: TaskState = 'done') {
  state[id] = status;
  current.value = nextTodo(id);
}

function toggle(id: TaskId) {
  current.value = current.value === id ? '' : id;
}

onBeforeMount(async () => {
  await toursStore.setCurrentTour('quick-start', 1);
  open.value = toursStore.tourOpen;
  await Promise.all([appConfigPromise, wsConfig.promise, integrationPromise.value]);
  if (appConfig.value.name) {
    appName.value = appConfig.value.name;
    state.name = 'done';
  }
  if (appConfig.value.logoUrl) {
    appLogo.value = appConfig.value.logoUrl;
    state.logo = 'done';
  }
  if (wsConfig.isActive) {
    appType.value = 'b2b';
    state.audience = 'done';
  }
  current.value = nextTodo();
});

async function run(id: TaskId, failure: string, work: () => Promise<void>) {
  saving.value = id;
  try {
    await work();
  } catch (error) {
    console.error(error);
    ElMessage.error(t(failure));
  } finally {
    saving.value = '';
  }
}

function saveName() {
  if (!appName.value.trim()) {
    ElMessage.error(t('App name is required'));
    return;
  }
  return run('name', 'Failed to save app name', async () => {
    await configurationsService.update('app-configuration', {
      metadata: { ...appConfig.value, name: appName.value.trim() },
    });
    softResetConfiguration();
    settle('name');
  });
}

function saveLogo() {
  if (!appLogo.value.trim()) {
    settle('logo', 'skipped');
    return;
  }
  return run('logo', 'Failed to save app logo', async () => {
    await configurationsService.update('app-configuration', {
      metadata: { ...appConfig.value, logoUrl: appLogo.value.trim() },
    });
    softResetConfiguration();
    settle('logo');
  });
}

function saveTheme() {
  const theme = themes.find((item) => item.value === selectedTheme.value);
  if (!theme) {
    ElMessage.info(t('Choose a theme or skip this step'));
    return;
  }
  return run('theme', 'Failed to save theme', async () => {
    await liveEdit.applyTheme(theme.palette);
    settle('theme');
  });
}

function saveAudience() {
  return run('audience', 'Failed to save app type', async () => {
    // B2B turns workspaces on and makes sure at least one label exists
    if (appType.value === 'b2b') {
      const labels = wsConfig.metadata.labels || [];
      if (labels.length === 0) {
        labels.push({ title: 'Basic', description: '', value: ['basic'] });
      }
      await configurationsService.update('workspace-configuration', {
        metadata: { ...wsConfig.metadata, isActive: true, labels },
      });
      wsConfig.reload();
    }
    settle('audience');
  });
}

async function generateBlueprintsFromAI(sourceId: string): Promise<any[]> {
  const response = await fetch(`/api/ai/sources/${sourceId}/blueprints`, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: aiPurpose.value }),
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response.json();
}

async function createBlueprints(blueprints: any[]) {
  const created: any[] = [];
  for (const blueprint of blueprints) {
    try {
      created.push(await blueprintsService.create(blueprint));
    } catch (error) {
      console.error(`Failed to create blueprint ${blueprint.name}:`, error);
    }
  }
  return created;
}

function saveAi() {
  const needsToken = !hasOpenAIIntegration.value;
  if (needsToken && !openAiToken.value.trim()) {
    ElMessage.error(t('OpenAI token is required'));
    return;
  }
  return run('ai', 'Failed to process AI purpose', async () => {
    let sourceId: string | undefined = groupedSources.value?.[IntegrationSourceKind.OpenAI]?.[0]?._id;

    if (needsToken) {
      const source: any = await integrationSourcesService.create({
        name: 'OpenAI',
        kind: IntegrationSourceKind.OpenAI,
        labels: [],
        authentication: { token: openAiToken.value.trim() },
      } as any);
      sourceId = source?._id;
      if (!hasQelosIntegration.value) {
        await integrationSourcesService.create({
          name: 'Qelos',
          kind: IntegrationSourceKind.Qelos,
          labels: [],
          authentication: { password: 'qelos' },
          metadata: { url: 'http://localhost:3000', username: 'qelos' },
        } as any);
      }
      integrationSourcesStore.retry();
    }

    if (aiPurpose.value.trim() && sourceId) {
      try {
        const generated = await generateBlueprintsFromAI(sourceId);
        createdBlueprints.value = await createBlueprints(generated || []);
        if (createdBlueprints.value.length) {
          ElMessage.success(`${createdBlueprints.value.length} ${t('blueprints')}`);
        } else {
          ElMessage.info(t('No blueprints were generated. You can create them manually later.'));
        }
      } catch (error) {
        console.error('Error generating blueprints:', error);
        ElMessage.warning(t('Failed to generate blueprints automatically. You can create them manually later.'));
      }
    }
    settle('ai');
  });
}

function onClose() {
  if (toursStore.tourOpen) {
    toursStore.tourFinished();
  }
}
</script>

<template>
  <div><el-button text @click="open = true">{{ $t('Quick Start') }}</el-button></div>
  <el-drawer
    v-model="open"
    :size="$isMobile ? '100%' : '560px'"
    append-to-body
    class="quick-start-drawer"
    @close="onClose"
  >
    <template #header>
      <div class="qs-head">
        <h2>{{ $t('Set up your app') }}</h2>
        <p class="qs-count" aria-live="polite">{{ doneCount }} / {{ tasks.length }} {{ $t('steps done') }}</p>
        <el-progress :percentage="progress" :show-text="false" :stroke-width="6" :aria-label="$t('Quick Start')" />
      </div>
    </template>

    <ol class="qs-tasks">
      <li v-for="(task, index) in tasks" :key="task.id" class="qs-task" :class="[state[task.id], { open: current === task.id }]">
        <button
          type="button"
          class="task-head"
          :aria-expanded="current === task.id"
          :aria-controls="`qs-${task.id}`"
          @click="toggle(task.id)"
        >
          <span class="task-mark" aria-hidden="true">
            <el-icon v-if="state[task.id] === 'done'"><Check /></el-icon>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="task-title">
            {{ task.title }}
            <small v-if="task.optional" class="task-optional">{{ $t('Optional') }}</small>
          </span>
          <span v-if="current !== task.id && state[task.id] !== 'todo'" class="task-summary" dir="auto">
            {{ state[task.id] === 'skipped' ? $t('Skipped') : task.summary }}
          </span>
          <el-icon class="task-chevron" :class="{ turned: current === task.id }"><ArrowDown /></el-icon>
        </button>

        <div v-if="current === task.id" :id="`qs-${task.id}`" class="task-body" role="region" :aria-label="task.title">
          <!-- name -->
          <form v-if="task.id === 'name'" @submit.prevent="saveName">
            <p class="task-help">{{ $t('This will be displayed as the title of your application.') }}</p>
            <FormInput v-model="appName" type="text" :placeholder="$t('Enter your app name')" autofocus />
            <div class="task-actions">
              <el-button type="primary" native-type="submit" :loading="saving === 'name'">{{ $t('Save and continue') }}</el-button>
            </div>
          </form>

          <!-- logo -->
          <form v-else-if="task.id === 'logo'" @submit.prevent="saveLogo">
            <p class="task-help">{{ $t('This will be displayed as the logo of your application.') }}</p>
            <FormInput v-model="appLogo" type="url" :placeholder="$t('Enter logo URL')" />
            <img v-if="appLogo" :src="appLogo" :alt="appName" class="logo-preview" />
            <div class="task-actions">
              <el-button native-type="button" @click="settle('logo', 'skipped')">{{ $t('Skip for now') }}</el-button>
              <el-button type="primary" native-type="submit" :loading="saving === 'logo'">{{ $t('Save and continue') }}</el-button>
            </div>
          </form>

          <!-- theme -->
          <div v-else-if="task.id === 'theme'">
            <p class="task-help">{{ $t('Choose a theme that matches your brand identity.') }}</p>
            <div class="theme-grid" role="radiogroup" :aria-label="$t('Theme')">
              <button
                v-for="theme in themes"
                :key="theme.value"
                type="button"
                role="radio"
                class="theme-card"
                :class="{ selected: selectedTheme === theme.value }"
                :aria-checked="selectedTheme === theme.value"
                @click="selectedTheme = theme.value"
              >
                <span class="theme-preview" :style="previewVars(theme.palette)" aria-hidden="true">
                  <span class="pv-nav"><i /><i class="active" /><i /></span>
                  <span class="pv-main">
                    <span class="pv-card">
                      <b class="pv-title" />
                      <i class="pv-line" />
                      <i class="pv-line short" />
                      <span class="pv-btn" />
                    </span>
                  </span>
                </span>
                <span class="theme-name">{{ theme.label }}</span>
                <span class="theme-font">{{ headingFont(theme.palette) }}</span>
              </button>
            </div>
            <p v-if="selectedTheme" class="theme-description">
              {{ themes.find((theme) => theme.value === selectedTheme)?.description }}
            </p>
            <div class="task-actions">
              <el-button @click="settle('theme', 'skipped')">{{ $t('Skip for now') }}</el-button>
              <el-button type="primary" :loading="saving === 'theme'" @click="saveTheme">{{ $t('Save and continue') }}</el-button>
            </div>
          </div>

          <!-- audience -->
          <div v-else-if="task.id === 'audience'">
            <p class="task-help">{{ $t('This will configure your workspace settings appropriately.') }}</p>
            <div class="audience-grid" role="radiogroup" :aria-label="$t('Is your app made for B2B or B2C?')">
              <button
                type="button"
                role="radio"
                class="audience-card"
                :class="{ selected: appType === 'b2b' }"
                :aria-checked="appType === 'b2b'"
                @click="appType = 'b2b'"
              >
                <el-icon><OfficeBuilding /></el-icon>
                <strong>{{ $t('B2B') }}</strong>
                <span>{{ $t('Business to Business') }}</span>
              </button>
              <button
                type="button"
                role="radio"
                class="audience-card"
                :class="{ selected: appType === 'b2c' }"
                :aria-checked="appType === 'b2c'"
                @click="appType = 'b2c'"
              >
                <el-icon><User /></el-icon>
                <strong>{{ $t('B2C') }}</strong>
                <span>{{ $t('Business to Consumer') }}</span>
              </button>
            </div>
            <p class="task-help">
              {{
                appType === 'b2b'
                  ? $t('B2B will enable workspace management and ensure at least one workspace label exists.')
                  : $t('B2C will keep workspace management disabled.')
              }}
            </p>
            <div class="task-actions">
              <el-button type="primary" :loading="saving === 'audience'" @click="saveAudience">{{ $t('Save and continue') }}</el-button>
            </div>
          </div>

          <!-- ai -->
          <form v-else-if="task.id === 'ai'" @submit.prevent="saveAi">
            <template v-if="!hasOpenAIIntegration">
              <p class="task-help">{{ $t('Connect your app to OpenAI for AI capabilities.') }}</p>
              <el-input
                v-model="openAiToken"
                type="password"
                show-password
                autocomplete="off"
                :placeholder="$t('Enter your OpenAI API key')"
                :aria-label="$t('Enter your OpenAI API key')"
              />
              <p class="task-hint">{{ $t('Your API key will be stored securely and used for AI integrations.') }}</p>
            </template>
            <p class="task-help">{{ $t('Describe how you want to use AI in your application.') }}</p>
            <el-input
              v-model="aiPurpose"
              type="textarea"
              :rows="4"
              :placeholder="$t('Describe what you want to achieve with AI in your app...')"
              :aria-label="$t('What should your app do with AI?')"
            />
            <p class="task-hint">{{ $t('This will help set up blueprints using the chat completion API.') }}</p>
            <ul v-if="createdBlueprints.length" class="blueprint-list">
              <li v-for="(blueprint, i) in createdBlueprints" :key="blueprint.id || blueprint._id || i">
                <el-icon><Check /></el-icon>
                <span dir="auto">{{ blueprint.name }}</span>
                <small>{{ Object.keys(blueprint.properties || {}).length }} {{ $t('props') }}</small>
              </li>
            </ul>
            <div class="task-actions">
              <el-button native-type="button" @click="settle('ai', 'skipped')">{{ $t('Skip for now') }}</el-button>
              <el-button type="primary" native-type="submit" :loading="saving === 'ai'">
                {{ aiPurpose.trim() ? $t('Generate blueprints') : $t('Save and continue') }}
              </el-button>
            </div>
          </form>
        </div>
      </li>
    </ol>

    <section v-if="allSettled" class="qs-complete" aria-live="polite">
      <h3>{{ $t('Setup Complete!') }}</h3>
      <p>{{ $t('Your Qelos application has been successfully configured. You can now start building your no-code solutions.') }}</p>
      <el-button type="primary" @click="open = false">
        {{ $t('DONE') }}
        <el-icon class="dir-icon"><ArrowRight /></el-icon>
      </el-button>
    </section>
  </el-drawer>
</template>

<style scoped lang="scss">
.qs-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  inline-size: 100%;

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.qs-count {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.qs-tasks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qs-task {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);

  &.open {
    border-color: var(--el-color-primary-light-5);
  }
}

.task-head {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 56px;
  padding: 10px 16px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.task-mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 28px;
  block-size: 28px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.done .task-mark {
  border-color: transparent;
  background: var(--el-color-primary);
  color: var(--el-color-white, #fff);
  box-shadow: 0 0 0 4px var(--el-color-primary-light-9);
}

.done .task-title {
  color: var(--el-text-color-secondary);
}

.skipped .task-mark {
  border-style: dashed;
}

.open .task-mark {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.task-title {
  flex: 1;
  min-inline-size: 0;
  font-weight: 600;
}

.task-optional {
  margin-inline-start: 8px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.task-summary {
  max-inline-size: 160px;
  overflow: hidden;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-chevron {
  flex: none;
  color: var(--el-text-color-secondary);
  transition: transform 0.15s ease;

  &.turned {
    transform: rotate(180deg);
  }
}

.task-body {
  padding: 4px 16px 16px;
}

.task-help {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.task-hint {
  margin: 8px 0 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-block-start: 16px;
}

.logo-preview {
  display: block;
  max-block-size: 56px;
  max-inline-size: 160px;
  margin-block-start: 10px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  object-fit: contain;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--el-color-primary);
  }
}

.theme-preview {
  display: flex;
  block-size: 84px;
  overflow: hidden;
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius);
  background: var(--pv-bg);
}

.pv-nav {
  display: flex;
  flex: 0 0 20%;
  flex-direction: column;
  gap: 6px;
  padding: 10px 6px;
  background: var(--pv-nav);

  i {
    display: block;
    block-size: 3px;
    border-radius: 2px;
    background: var(--pv-nav-text);
    opacity: 0.7;

    &.active {
      background: var(--pv-nav-active);
      opacity: 1;
    }
  }
}

.pv-main {
  display: flex;
  flex: 1;
  padding: 8px;
}

.pv-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  padding: 7px;
  border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius);
  background: var(--pv-surface);
  box-shadow: var(--pv-shadow);
}

.pv-title {
  inline-size: 55%;
  block-size: 5px;
  border-radius: 2px;
  background: var(--pv-main);
}

.pv-line {
  display: block;
  block-size: 3px;
  border-radius: 2px;
  background: var(--pv-text);
  opacity: 0.35;

  &.short {
    inline-size: 65%;
  }
}

.pv-btn {
  inline-size: 36%;
  block-size: 10px;
  margin-block-start: auto;
  border-radius: var(--pv-btn-radius);
  background: var(--pv-btn);
}

.theme-font {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.theme-name {
  font-size: 13px;
  font-weight: 600;
}

.theme-description {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-block-end: 12px;
}

.audience-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 10px;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: center;
  cursor: pointer;

  .el-icon {
    font-size: 26px;
    color: var(--el-color-primary);
  }

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.blueprint-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .el-icon {
    color: var(--el-color-primary);
  }

  small {
    margin-inline-start: auto;
    color: var(--el-text-color-secondary);
  }
}

.qs-complete {
  margin-block-start: 20px;
  padding: 20px;
  border-radius: 12px;
  background: var(--el-color-primary-light-9);

  h3 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  p {
    margin: 0 0 14px;
    color: var(--el-text-color-regular);
  }
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (prefers-reduced-motion: reduce) {
  .task-chevron {
    transition: none;
  }
}
</style>
