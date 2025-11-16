import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDispatcher } from '../../core/compositions/dispatcher'
import eventsService, { IEvent } from '@/services/apis/events-service'

interface Filters {
  kind?: string
  eventName?: string
  source?: string
  period?: string
  page?: number
}

export function useEventsList() {
  const route = useRoute()
  const router = useRouter()

  const kind = computed(() => (route.query.kind as string) || undefined)
  const eventName = computed(() => (route.query.eventName as string) || undefined)
  const source = computed(() => (route.query.source as string) || undefined)
  const period = computed(() => (route.query.period as string) || 'last-week')
  const page = computed(() => (route.query.page ? Number(route.query.page) : 0))

  function updateFilters(filters: Filters) {
    router.push({
      query: {
        ...route.query,
        kind: filters.kind || undefined,
        eventName: filters.eventName || undefined,
        source: filters.source || undefined,
        period: filters.period || undefined,
        page:
          filters.page !== undefined && !Number.isNaN(filters.page)
            ? filters.page.toString()
            : undefined,
      },
    })
  }

  const { result: events, retry, loading } = useDispatcher<IEvent[]>(
    () =>
      eventsService.getAll({
        kind: kind.value || '*',
        eventName: eventName.value || '*',
        source: source.value || '*',
        period: period.value,
        page: page.value,
      }),
    [],
  )

  const uniqueKinds = computed(() =>
    Array.from(new Set(events.value.map((evt) => evt.kind).filter(Boolean))).sort(),
  )

  const uniqueEventNames = computed(() =>
    Array.from(new Set(events.value.map((evt) => evt.eventName).filter(Boolean))).sort(),
  )

  const uniqueSources = computed(() =>
    Array.from(new Set(events.value.map((evt) => evt.source).filter(Boolean))).sort(),
  )

  watch([kind, eventName, source, period, page], retry)

  return {
    events,
    loading,
    updateFilters,
    uniqueKinds,
    uniqueEventNames,
    uniqueSources,
    filters: {
      kind,
      eventName,
      source,
      period,
      page,
    },
  }
}
