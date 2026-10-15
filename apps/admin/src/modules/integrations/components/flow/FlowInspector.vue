<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { Close } from '@element-plus/icons-vue';
import { useFlowCanvasStore } from '../../store/flow-canvas';
import { AUTOMATION_TYPES } from '../../services/integration-presentation';
import { signatureKey, signatureLabel } from '../../services/flow-graph';
import { useI18n } from 'vue-i18n';
import { watch } from 'vue';
import { useFlowActivityStore } from '../../store/flow-activity';
import { nodeActivities, activityLevel } from '../../services/flow-activity';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import type { EventSignature } from '../../services/flow-graph';

const { t, locale } = useI18n();
const activityStore = useFlowActivityStore();
const router = useRouter();
const store = useFlowCanvasStore();
const { selected, relations, selectedEdge, busy } = storeToRefs(store);

const integration = computed(() => (selected.value?.type === 'integration' ? selected.value : null));
const typeLabel = computed(() => (integration.value ? t(AUTOMATION_TYPES.find((entry) => entry.key === integration.value!.automationType)!.label.replace(/s$/, '')) : ''));
// the events behind the selection, each with its numbers and the latest occurrences
const events = computed<{ role: string; signature: EventSignature; level: string; day: number; week: number; last?: string }[]>(() => {
  if (selectedEdge.value) {
    const activity = activityStore.of(selectedEdge.value.signature);
    return [{ role: 'link', signature: selectedEdge.value.signature, level: activityLevel(activity), day: activity.day, week: activity.week, last: activity.last }];
  }
  if (!selected.value) return [];
  return nodeActivities(selected.value, activityStore.activities).map((item) => {
    const signature = item.role === 'announces' ? (selected.value as any).emits : selected.value!.type === 'event' ? (selected.value as any).signature : (selected.value as any).trigger.event;
    return { role: item.role, signature, level: activityLevel(item.activity), day: item.activity.day, week: item.activity.week, last: item.activity.last };
  });
});

watch(events, (list) => list.forEach((entry) => entry.signature && !activityStore.recent[signatureKey(entry.signature)] && activityStore.loadRecent(entry.signature)), { immediate: true });

const recentOf = (signature: EventSignature) => activityStore.recent[signatureKey(signature)] || [];
const ago = (value: string | Date) => formatRelative(value, new Date(), locale.value || undefined);
const roleText = (role: string) => (role === 'announces' ? t('Announced') : role === 'receives' ? t('Received') : role === 'link' ? t('Sent') : t('Started by'));
const logLink = (signature: EventSignature) => ({ name: 'log', query: { source: signature.source, kind: signature.kind, eventName: signature.eventName, period: 'last-month' } });

const nameOf = (id: string) => {
  const node = store.nodeById(id);
  return node?.type === 'integration' ? node.name : node?.type === 'event' ? node.signature.eventName : id;
};

const addNext = () => {
  const node = selected.value!;
  router.push({ name: 'integration-new', query: { type: 'workflow', after: node.type === 'event' ? `event:${signatureKey(node.signature)}` : node.id } });
};

const open = () => router.push({ name: 'integration-edit', params: { integrationId: selected.value!.id } });

</script>

<template>
  <aside v-if="selectedEdge" class="inspector" :aria-label="$t('Link')">
    <header class="head">
      <div class="titles">
        <h2 dir="auto">{{ selectedEdge.signature.eventName }}</h2>
        <span class="sub">{{ $t('Link') }}</span>
      </div>
      <el-button text circle :aria-label="$t('Close')" @click="store.selectEdge(null)"><el-icon><Close /></el-icon></el-button>
    </header>
    <dl class="facts">
      <div><dt>{{ $t('From') }}</dt><dd dir="auto"><button type="button" class="link" @click="store.select(selectedEdge.from)">{{ nameOf(selectedEdge.from) }}</button></dd></div>
      <div><dt>{{ $t('To') }}</dt><dd dir="auto"><button type="button" class="link" @click="store.select(selectedEdge.to)">{{ nameOf(selectedEdge.to) }}</button></dd></div>
      <div><dt>{{ $t('Event') }}</dt><dd dir="ltr">{{ signatureLabel(selectedEdge.signature) }}</dd></div>
    </dl>

    <section v-for="entry in events" :key="entry.role + entry.signature.eventName" class="activity" :class="`level-${entry.level}`">
      <h3><span class="dot" aria-hidden="true" />{{ roleText(entry.role) }}: <code dir="ltr">{{ entry.signature.eventName }}</code></h3>
      <p class="numbers">{{ $t('{day} in 24h · {week} in 7 days', { day: entry.day, week: entry.week }) }}<template v-if="entry.last"> · {{ $t('last') }} {{ ago(entry.last) }}</template><template v-else> · {{ $t('none in the last month') }}</template></p>
      <ul v-if="recentOf(entry.signature).length" class="recent">
        <li v-for="event in recentOf(entry.signature)" :key="event._id"><time>{{ ago(event.created) }}</time><span dir="auto">{{ event.description || event.eventName }}</span></li>
      </ul>
      <router-link class="link" :to="logLink(entry.signature)">{{ $t('Open in the events log') }}</router-link>
    </section>
    <footer class="actions">
      <el-button type="danger" plain :loading="busy" @click="store.disconnect(selectedEdge.id)">{{ $t('Disconnect') }}</el-button>
    </footer>
  </aside>

  <aside v-else-if="selected" class="inspector" :aria-label="$t('Details')">
    <header class="head">
      <div class="titles">
        <h2 dir="auto">{{ integration ? integration.name : (selected as any).signature.eventName }}</h2>
        <span class="sub">{{ integration ? typeLabel : $t('Platform event') }}</span>
      </div>
      <el-button text circle :aria-label="$t('Close')" @click="store.select(null)"><el-icon><Close /></el-icon></el-button>
    </header>

    <template v-if="integration">
      <dl class="facts">
        <div><dt>{{ $t('When') }}</dt><dd dir="auto">{{ [integration.trigger.source, integration.trigger.event?.eventName || integration.trigger.operation].filter(Boolean).join(' · ') || '—' }}</dd></div>
        <div v-if="integration.steps"><dt>{{ $t('Transform') }}</dt><dd>{{ $t('{count} steps', { count: integration.steps }) }}</dd></div>
        <div><dt>{{ $t('Then') }}</dt><dd dir="auto">{{ [integration.target.source, integration.target.operation].filter(Boolean).join(' · ') || '—' }}</dd></div>
        <div v-if="integration.emits"><dt>{{ $t('Announces') }}</dt><dd dir="ltr">{{ signatureLabel(integration.emits) }}</dd></div>
      </dl>
      <p v-if="integration.emits && !integration.listeners" class="warn" role="status">{{ $t('Nobody listens to this event yet.') }}</p>
    </template>
    <dl v-else class="facts">
      <div><dt>{{ $t('Event') }}</dt><dd dir="ltr">{{ signatureLabel((selected as any).signature) }}</dd></div>
    </dl>


    <section v-for="entry in events" :key="entry.role + entry.signature.eventName" class="activity" :class="`level-${entry.level}`">
      <h3><span class="dot" aria-hidden="true" />{{ roleText(entry.role) }}: <code dir="ltr">{{ entry.signature.eventName }}</code></h3>
      <p class="numbers">{{ $t('{day} in 24h · {week} in 7 days', { day: entry.day, week: entry.week }) }}<template v-if="entry.last"> · {{ $t('last') }} {{ ago(entry.last) }}</template><template v-else> · {{ $t('none in the last month') }}</template></p>
      <ul v-if="recentOf(entry.signature).length" class="recent">
        <li v-for="event in recentOf(entry.signature)" :key="event._id"><time>{{ ago(event.created) }}</time><span dir="auto">{{ event.description || event.eventName }}</span></li>
      </ul>
      <router-link class="link" :to="logLink(entry.signature)">{{ $t('Open in the events log') }}</router-link>
    </section>

    <section v-if="relations.triggeredBy.length" class="rel">
      <h3>{{ $t('Started by') }}</h3>
      <ul>
        <li v-for="id in relations.triggeredBy" :key="id"><button type="button" class="link" @click="store.select(id)" dir="auto">{{ nameOf(id) }}</button></li>
      </ul>
    </section>
    <section v-if="relations.triggers.length" class="rel">
      <h3>{{ $t('Starts') }}</h3>
      <ul>
        <li v-for="id in relations.triggers" :key="id"><button type="button" class="link" @click="store.select(id)" dir="auto">{{ nameOf(id) }}</button></li>
      </ul>
    </section>

    <footer class="actions">
      <el-button v-if="integration" type="primary" @click="open">{{ $t('Open') }}</el-button>
      <el-button @click="addNext"><font-awesome-icon :icon="['fas', 'plus']" aria-hidden="true" />&nbsp;{{ $t('Add next step') }}</el-button>
    </footer>
  </aside>
</template>

<style scoped lang="scss">
.inspector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  inline-size: 280px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  overflow-y: auto;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }
}

.sub {
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;

  dt {
    color: var(--el-text-color-secondary);
    font-size: 0.74rem;
  }

  dd {
    margin: 0;
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }
}

.warn {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  font-size: 0.84rem;
  text-align: start;
}

.rel {
  h3 {
    margin: 0 0 4px;
    padding: 0;
    color: var(--el-text-color-secondary);
    font-size: 0.78rem;
    font-weight: 600;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
}

.link {
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  font-size: 0.9rem;
  text-align: start;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.activity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-block-start: 10px;
  border-block-start: 1px solid var(--el-border-color-extra-light);

  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 0;
    font-size: 0.82rem;
    font-weight: 600;

    code {
      overflow: hidden;
      font-size: 0.8rem;
      text-overflow: ellipsis;
    }
  }
}

.dot {
  flex: none;
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-border-color-dark);
}

.level-active .dot {
  background: var(--el-color-success);
}

.level-recent .dot {
  background: var(--el-color-primary-light-5);
}

.numbers {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-align: start;
}

.recent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 8px;
    font-size: 0.8rem;
  }

  time {
    flex: none;
    color: var(--el-text-color-secondary);
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.activity .link {
  align-self: flex-start;
  font-size: 0.82rem;
  text-decoration: none;
}
</style>
