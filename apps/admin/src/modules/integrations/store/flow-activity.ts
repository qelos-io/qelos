import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import eventsService, { type IEvent } from '@/services/apis/events-service';
import { signatureKey, type EventSignature } from '../services/flow-graph';
import { EMPTY_ACTIVITY, runLimited, type Activity, type ActivityMap } from '../services/flow-activity';

const FRESH_FOR = 2 * 60 * 1000;
const CONCURRENCY = 3;

const query = (signature: EventSignature) => ({ source: signature.source, kind: signature.kind, eventName: signature.eventName });

/** What the platform recorded for the events the canvas shows: how many in a day and a week, and when the last one was. */
export const useFlowActivityStore = defineStore('flow-activity', () => {
  const activities = ref<ActivityMap>({});
  const loadedAt = ref<Record<string, number>>({});
  const loading = ref(false);
  const failed = ref(false);
  const recent = ref<Record<string, IEvent[]>>({});

  async function loadOne(signature: EventSignature): Promise<Activity> {
    const [day, week, latest] = await Promise.all([
      eventsService.getCount({ ...query(signature), period: 'last-day' }),
      eventsService.getCount({ ...query(signature), period: 'last-week' }),
      eventsService.getAll({ ...query(signature), period: 'last-month', page: 0, limit: 1 }),
    ]);
    const last = latest.events?.[0]?.created;
    return { day: day.count, week: week.count, ...(last ? { last: new Date(last).toISOString() } : {}) };
  }

  /** Loads what is missing or stale; `force` reloads everything. Failures leave the numbers out rather than inventing them. */
  async function load(signatures: EventSignature[], force = false) {
    const now = Date.now();
    const wanted = signatures.filter((signature) => force || !loadedAt.value[signatureKey(signature)] || now - loadedAt.value[signatureKey(signature)] > FRESH_FOR);
    if (!wanted.length) return;
    loading.value = true;
    failed.value = false;
    try {
      await runLimited(wanted, CONCURRENCY, async (signature) => {
        try {
          const key = signatureKey(signature);
          activities.value = { ...activities.value, [key]: await loadOne(signature) };
          loadedAt.value[key] = Date.now();
        } catch {
          failed.value = true;
        }
      });
    } finally {
      loading.value = false;
    }
  }

  async function loadRecent(signature: EventSignature) {
    const key = signatureKey(signature);
    try {
      const response = await eventsService.getAll({ ...query(signature), period: 'last-month', page: 0, limit: 5 });
      recent.value = { ...recent.value, [key]: response.events || [] };
    } catch {
      recent.value = { ...recent.value, [key]: [] };
    }
  }

  const of = (signature: EventSignature) => activities.value[signatureKey(signature)] ?? EMPTY_ACTIVITY;
  const known = computed(() => Object.keys(activities.value).length > 0);

  return { activities, loading, failed, recent, known, load, loadRecent, of };
});
