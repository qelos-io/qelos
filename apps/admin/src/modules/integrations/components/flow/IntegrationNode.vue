<script lang="ts" setup>
import { computed } from 'vue';
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useFlowActivityStore } from '../../store/flow-activity';
import { useFlowCanvasStore } from '../../store/flow-canvas';
import { activityLevel, countFor, nodeActivities } from '../../services/flow-activity';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import { useIntegrationKinds } from '../../compositions/integration-kinds';
import { AUTOMATION_TYPES } from '../../services/integration-presentation';
import type { IntegrationNodeData } from '../../services/flow-graph';

const props = defineProps<NodeProps<IntegrationNodeData>>();
const { t, locale } = useI18n();
const activityStore = useFlowActivityStore();
const { activities } = storeToRefs(activityStore);
const { showActivity, period } = storeToRefs(useFlowCanvasStore());
const kinds = useIntegrationKinds() as Record<string, { logo?: string; name: string }>;

const typeLabel = computed(() => t(AUTOMATION_TYPES.find((entry) => entry.key === props.data.automationType)!.label.replace(/s$/, '')));
const logo = (kind: string) => kinds[kind]?.logo;
// what the platform recorded for the events this integration waits for and announces
const runs = computed(() => {
  if (!showActivity.value) return [];
  return nodeActivities(props.data, activities.value).map((item) => ({
    role: item.role,
    level: activityLevel(item.activity),
    count: countFor(item.activity, period.value),
    ago: item.activity.last ? formatRelative(item.activity.last, new Date(), locale.value || undefined) : '',
  }));
});
const roleLabel = (role: string) => (role === 'announces' ? t('Announced') : t('Started'));

const triggerText = computed(() => [props.data.trigger.source, props.data.trigger.event?.eventName || props.data.trigger.operation].filter(Boolean).join(' · '));
const targetText = computed(() => [props.data.target.source, props.data.target.operation].filter(Boolean).join(' · '));
</script>

<template>
  <article class="node" :class="{ off: !data.active, selected }" :aria-label="data.name">
    <Handle v-if="data.canListen" type="target" :position="Position.Left" class="handle" />

    <header class="head">
      <strong class="name" dir="auto">{{ data.name }}</strong>
      <span class="type">{{ typeLabel }}</span>
    </header>

    <ol class="flow">
      <li>
        <img v-if="logo(data.kinds[0])" :src="logo(data.kinds[0])" alt="" class="logo" />
        <span class="line" dir="auto"><small>{{ $t('When') }}</small>{{ triggerText || '—' }}</span>
      </li>
      <li v-if="data.steps" class="steps">
        <font-awesome-icon :icon="['fas', 'shuffle']" class="logo-icon" aria-hidden="true" />
        <span class="line"><small>{{ $t('Transform') }}</small>{{ $t('{count} steps', { count: data.steps }) }}</span>
      </li>
      <li>
        <img v-if="logo(data.kinds[1])" :src="logo(data.kinds[1])" alt="" class="logo" />
        <span class="line" dir="auto"><small>{{ $t('Then') }}</small>{{ targetText || '—' }}</span>
      </li>
    </ol>

    <ul v-if="runs.length" class="runs" :aria-label="$t('Activity')">
      <li v-for="run in runs" :key="run.role" :class="`level-${run.level}`">
        <span class="dot" aria-hidden="true" />
        <span class="run-text">{{ roleLabel(run.role) }} {{ run.count }}× <template v-if="run.ago">· {{ run.ago }}</template><template v-else>· {{ $t('never lately') }}</template></span>
      </li>
    </ul>

    <footer v-if="data.emits || !data.active" class="foot">
      <span v-if="!data.active" class="chip muted">{{ $t('Inactive') }}</span>
      <span v-if="data.emits" class="chip emit" :class="{ lonely: !data.listeners }" :title="data.listeners ? '' : $t('Nobody listens to this event yet')">
        <font-awesome-icon :icon="['fas', 'bolt']" aria-hidden="true" />{{ data.emits.eventName }}
      </span>
    </footer>

    <Handle type="source" :position="Position.Right" class="handle" />
  </article>
</template>

<style scoped lang="scss">
.node {
  inline-size: 270px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  color: var(--el-text-color-primary);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
  }

  &.off {
    opacity: 0.6;
  }
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-end: 8px;
}

.name {
  overflow: hidden;
  font-size: 0.95rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type {
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 0.72rem;
}

.flow {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-inline-size: 0;
  }
}

.logo,
.logo-icon {
  flex: none;
  inline-size: 20px;
  block-size: 20px;
  object-fit: contain;
}

.logo-icon {
  padding: 3px;
  color: var(--el-text-color-secondary);
}

.line {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  overflow: hidden;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;

  small {
    color: var(--el-text-color-secondary);
    font-size: 0.68rem;
    text-transform: none;
  }
}

.runs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 8px 0 0;
  padding: 6px 0 0;
  border-block-start: 1px solid var(--el-border-color-extra-light);
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--el-text-color-secondary);
    font-size: 0.72rem;
  }
}

.dot {
  flex: none;
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: var(--el-border-color-dark);
}

.level-active .dot {
  background: var(--el-color-success);
}

.level-recent .dot {
  background: var(--el-color-primary-light-5);
}

.run-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-start: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-inline-size: 100%;
  padding: 1px 8px;
  overflow: hidden;
  border-radius: 999px;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.emit {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);

    &.lonely {
      background: var(--el-color-warning-light-9);
      color: var(--el-color-warning);
    }
  }

  &.muted {
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
  }
}

.handle {
  inline-size: 9px;
  block-size: 9px;
  border: 2px solid var(--surface);
  background: var(--el-color-primary);
}
</style>
