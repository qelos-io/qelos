<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Delete, CopyDocument, Edit, MoreFilled } from '@element-plus/icons-vue';
import type { IIntegration } from '@qelos/global-types';
import integrationsService from '@/services/apis/integrations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useViewport } from '@/modules/core/compositions/viewport';
import { useIntegrationsStore } from '../../store/integrations';
import { useIntegrationSourcesStore } from '../../store/integration-sources';
import { useIntegrationKinds } from '../../compositions/integration-kinds';
import {
  AUTOMATION_TYPES,
  automationDescription,
  automationFlow,
  automationName,
  classifyAutomation,
  cloneForCreate,
  countByType,
  filterAutomations,
  type AutomationType,
  type StateFilter,
} from '../../services/integration-presentation';
import WorkflowsView from '../WorkflowsView.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { width } = useViewport();
const store = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();
const kinds = useIntegrationKinds() as Record<string, { logo?: string; name: string }>;

const sourcesById = computed(() => Object.fromEntries((sourcesStore.result || []).map((source: any) => [source._id, source])));
const all = computed(() => (store.integrations || []) as IIntegration[]);

// ---- filters ----
const type = ref<AutomationType | 'all'>('all');
const state = ref<StateFilter>('all');
const query = computed(() => (route.query.q as string) || '');

const counts = computed(() => countByType(all.value));
const visibleTypes = computed(() => AUTOMATION_TYPES.filter((entry) => counts.value[entry.key] > 0));
const rows = computed(() =>
  filterAutomations(all.value, { type: type.value, state: state.value, query: query.value }, sourcesById.value).sort((a, b) =>
    automationName(a, sourcesById.value).localeCompare(automationName(b, sourcesById.value)),
  ),
);
const hasFilters = computed(() => type.value !== 'all' || state.value !== 'all' || !!query.value);
function clearFilters() {
  type.value = 'all';
  state.value = 'all';
  if (query.value) router.replace({ query: { ...route.query, q: undefined } });
}

// ---- display: list, or the diagram on wide screens ----
const display = computed({
  get: () => (route.query.display === 'map' && width.value >= 1100 ? 'map' : 'list'),
  set: (value) => router.replace({ query: { ...route.query, display: value === 'map' ? 'map' : undefined } }),
});

// ---- row actions ----
const typeLabel = (automation: IIntegration) => t(AUTOMATION_TYPES.find((entry) => entry.key === classifyAutomation(automation))!.label.replace(/s$/, ''));
const edit = (automation: IIntegration) => router.push({ query: { ...route.query, mode: 'edit', id: automation._id } });

const busy = ref<Record<string, boolean>>({});
async function toggle(automation: IIntegration, value: boolean) {
  busy.value[automation._id] = true;
  try {
    await integrationsService.update(automation._id, { active: value });
    automation.active = value;
    ElMessage.success(value ? t('Integration activated') : t('Integration deactivated'));
  } catch {
    ElMessage.error(t('Failed to update integration status'));
  } finally {
    busy.value[automation._id] = false;
  }
}

function duplicate(automation: IIntegration) {
  sessionStorage.setItem('clonedIntegration', JSON.stringify(cloneForCreate(automation)));
  const query: Record<string, string> = { mode: 'create', clone: 'true' };
  if (classifyAutomation(automation) === 'ai-agent') query.agentMode = 'true';
  router.push({ query });
}

const remove = useConfirmAction(async (automation: IIntegration) => {
  await integrationsService.remove(automation._id);
  store.retry();
});

function onCommand(command: string, automation: IIntegration) {
  if (command === 'edit') edit(automation);
  else if (command === 'duplicate') duplicate(automation);
  else if (command === 'remove') remove(automation);
}

const create = (kind: 'agent' | 'workflow') => router.push({ query: kind === 'agent' ? { mode: 'create', agentMode: 'true' } : { mode: 'create', type: 'workflow' } });
</script>

<template>
  <div class="automations">
    <template v-if="!store.loaded">
      <el-skeleton :rows="1" animated class="skeleton" />
      <el-skeleton v-for="n in 4" :key="n" :rows="1" animated class="skeleton" />
    </template>

    <div v-else-if="!all.length" class="empty">
      <h2>{{ $t('No integrations yet') }}</h2>
      <p>{{ $t('An integration connects something that happens (a trigger) to something that should follow (an action). Start with an AI agent or build your own workflow.') }}</p>
      <div class="empty-actions">
        <el-button type="primary" @click="create('agent')">{{ $t('Create an AI agent') }}</el-button>
        <el-button @click="create('workflow')">{{ $t('Create a workflow') }}</el-button>
      </div>
    </div>

    <template v-else>
      <div class="toolbar">
        <ul class="chips" role="group" :aria-label="$t('Type')">
          <li>
            <button type="button" class="chip" :class="{ active: type === 'all' }" :aria-pressed="type === 'all'" @click="type = 'all'">{{ $t('All') }} <span class="n">{{ counts.all }}</span></button>
          </li>
          <li v-for="entry in visibleTypes" :key="entry.key">
            <button type="button" class="chip" :class="{ active: type === entry.key }" :aria-pressed="type === entry.key" @click="type = entry.key">{{ $t(entry.label) }} <span class="n">{{ counts[entry.key] }}</span></button>
          </li>
        </ul>
        <div class="toolbar-right">
          <el-segmented v-model="state" size="small" :options="[{ label: $t('All'), value: 'all' }, { label: $t('Active'), value: 'active' }, { label: $t('Inactive'), value: 'inactive' }]" :aria-label="$t('State')" />
          <el-segmented v-if="width >= 1100" v-model="display" size="small" :options="[{ label: $t('List'), value: 'list' }, { label: $t('Map'), value: 'map' }]" :aria-label="$t('Display')" />
        </div>
      </div>

      <WorkflowsView v-if="display === 'map'" />

      <template v-else>
        <div v-if="!rows.length" class="no-match">
          <p>{{ $t('No integrations match these filters.') }}</p>
          <el-button text type="primary" @click="clearFilters">{{ $t('Clear filters') }}</el-button>
        </div>

        <ul v-else class="rows">
          <li v-for="automation in rows" :key="automation._id" class="row" :class="{ off: automation.active === false }">
            <button type="button" class="main" @click="edit(automation)">
              <span class="logos" aria-hidden="true">
                <img v-if="kinds[automation.kind?.[0]]?.logo" :src="kinds[automation.kind[0]].logo" alt="" />
                <span v-else class="logo-fallback">{{ (kinds[automation.kind?.[0]]?.name || '?').slice(0, 1) }}</span>
                <font-awesome-icon :icon="['fas', 'arrow-right']" class="arrow" />
                <img v-if="kinds[automation.kind?.[1]]?.logo" :src="kinds[automation.kind[1]].logo" alt="" />
                <span v-else class="logo-fallback">{{ (kinds[automation.kind?.[1]]?.name || '?').slice(0, 1) }}</span>
              </span>
              <span class="text">
                <strong class="name" dir="auto">{{ automationName(automation, sourcesById) }}</strong>
                <span class="flow" dir="auto">
                  {{ automationFlow(automation, sourcesById).from.source || '?' }} · {{ automationFlow(automation, sourcesById).from.operation }}
                  →
                  {{ automationFlow(automation, sourcesById).to.source || '?' }} · {{ automationFlow(automation, sourcesById).to.operation }}
                </span>
                <span v-if="automationDescription(automation)" class="desc" dir="auto">{{ automationDescription(automation) }}</span>
              </span>
            </button>
            <span class="type">{{ typeLabel(automation) }}</span>
            <el-switch
              :model-value="automation.active !== false"
              :loading="busy[automation._id]"
              :aria-label="`${$t('Active')}: ${automationName(automation, sourcesById)}`"
              @change="toggle(automation, $event as boolean)"
            />
            <el-dropdown trigger="click" @command="onCommand($event, automation)">
              <el-button text circle :aria-label="`${$t('Actions')}: ${automationName(automation, sourcesById)}`"><el-icon><MoreFilled /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit"><el-icon><Edit /></el-icon>{{ $t('Edit') }}</el-dropdown-item>
                  <el-dropdown-item command="duplicate"><el-icon><CopyDocument /></el-icon>{{ $t('Duplicate') }}</el-dropdown-item>
                  <el-dropdown-item command="remove" divided><el-icon><Delete /></el-icon>{{ $t('Delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.automations {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--surface);
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.n {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.rows {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);

  .row + .row {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-inline-end: 10px;

  &.off .main {
    opacity: 0.6;
  }
}

.main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 14px;
  min-inline-size: 0;
  padding: 12px 8px 12px 16px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.logos {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;

  img,
  .logo-fallback {
    inline-size: 28px;
    block-size: 28px;
    object-fit: contain;
  }

  .logo-fallback {
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
    font-weight: 700;
  }
}

.arrow {
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

[dir='rtl'] .arrow {
  transform: scaleX(-1);
}

.text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.name,
.flow,
.desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow,
.desc {
  color: var(--el-text-color-secondary);
  font-size: 0.84rem;
}

.type {
  flex: none;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 0.78rem;
  white-space: nowrap;
}

.empty {
  padding: 40px 20px;
  border: 1px dashed var(--el-border-color);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  text-align: center;

  h2 {
    margin: 0 0 6px;
    padding: 0;
    font-size: 1.2rem;
  }

  p {
    max-inline-size: 520px;
    margin: 0 auto 16px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 639px) {
  .row {
    flex-wrap: wrap;
    padding: 0 10px 8px 0;
  }

  .main {
    flex-basis: 100%;
    padding: 12px 8px 4px 12px;
  }

  .type {
    margin-inline-start: 12px;
  }

  .row .el-switch {
    margin-inline-start: auto;
  }
}
</style>
