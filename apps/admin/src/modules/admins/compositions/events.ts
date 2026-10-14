import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import eventsService, {
  IEvent,
  IEventsFilterOptions,
  IEventsOverview,
  IEventsQueryParams,
} from '@/services/apis/events-service'

const PAGE_SIZE = 50
const TIMELINE_BUCKETS = 24
const FILTER_KEYS = ['kind', 'eventName', 'source', 'user', 'workspace', 'search', 'period', 'from', 'to'] as const

export type EventsFilterKey = (typeof FILTER_KEYS)[number]
export type EventsFilters = Partial<Record<EventsFilterKey, string>>

const EMPTY_OVERVIEW: IEventsOverview = { buckets: [], kinds: [], total: 0, errors: 0 }

export function useEventsFeed() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed(() => {
    const result: EventsFilters = {}
    for (const key of FILTER_KEYS) {
      const value = route.query[key]
      if (typeof value === 'string' && value) {
        result[key] = value
      }
    }
    if (result.from || result.to) {
      delete result.period
    } else {
      result.period = result.period || 'last-week'
    }
    return result
  })

  // filters that narrow the feed (everything except the time range)
  const activeFilterKeys = computed(() =>
    (['kind', 'eventName', 'source', 'user', 'workspace', 'search'] as const).filter((key) => filters.value[key]),
  )

  const events = ref<IEvent[]>([])
  const total = ref(0)
  const totalCapped = ref(false)
  const page = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(false)
  const overview = ref<IEventsOverview>(EMPTY_OVERVIEW)
  const overviewLoading = ref(false)
  const filterOptions = ref<IEventsFilterOptions>({ kinds: [], eventNames: [], sources: [] })

  const hasMore = computed(() => page.value + 1 < totalPages.value)

  function queryFor(extra: Partial<IEventsQueryParams> = {}): IEventsQueryParams {
    const f = filters.value
    return {
      kind: f.kind || '*',
      eventName: f.eventName || '*',
      source: f.source || '*',
      user: f.user,
      workspace: f.workspace,
      search: f.search,
      period: f.period,
      from: f.from,
      to: f.to,
      ...extra,
    }
  }

  let requestId = 0

  async function reload() {
    const current = ++requestId
    loading.value = true
    error.value = false
    overviewLoading.value = true

    const listPromise = eventsService.getAll({ ...queryFor(), page: 0, limit: PAGE_SIZE })
    const overviewPromise = eventsService
      .getOverview({ ...queryFor(), buckets: TIMELINE_BUCKETS })
      .catch(() => EMPTY_OVERVIEW)

    try {
      const list = await listPromise
      if (current !== requestId) return
      events.value = list.events
      total.value = list.total
      totalCapped.value = !!list.totalCapped
      totalPages.value = list.totalPages
      page.value = 0
    } catch (e) {
      if (current !== requestId) return
      events.value = []
      total.value = 0
      error.value = true
    } finally {
      if (current === requestId) loading.value = false
    }

    const overviewResult = await overviewPromise
    if (current === requestId) {
      overview.value = overviewResult
      overviewLoading.value = false
    }
  }

  async function loadMore() {
    if (loadingMore.value || loading.value || !hasMore.value) return
    const current = requestId
    loadingMore.value = true
    try {
      const next = await eventsService.getAll({ ...queryFor(), page: page.value + 1, limit: PAGE_SIZE })
      if (current !== requestId) return
      const known = new Set(events.value.map((event) => event._id))
      events.value = events.value.concat(next.events.filter((event) => !known.has(event._id)))
      page.value = next.page
      totalPages.value = next.totalPages
    } finally {
      loadingMore.value = false
    }
  }

  async function loadFilterOptions() {
    try {
      filterOptions.value = await eventsService.getFilterOptions(queryFor())
    } catch {
      // options are a convenience; the feed still works without them
    }
  }

  function setFilters(patch: Record<string, string | undefined>) {
    const query = { ...route.query }
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        query[key] = value
      } else {
        delete query[key]
      }
    }
    router.push({ query })
  }

  function clearFilters() {
    const query = { ...route.query }
    for (const key of FILTER_KEYS) {
      delete query[key]
    }
    router.push({ query })
  }

  const selectedId = computed(() => (route.query.eventId as string) || '')
  const fetchedEvent = ref<IEvent | null>(null)
  const selectedEvent = computed(
    () => events.value.find((event) => event._id === selectedId.value) ?? (fetchedEvent.value?._id === selectedId.value ? fetchedEvent.value : null),
  )

  function selectEvent(id?: string) {
    const query = { ...route.query }
    if (id) {
      query.eventId = id
    } else {
      delete query.eventId
    }
    // keep the history clean while browsing the feed
    router.replace({ query })
  }

  watch(
    [selectedId, events],
    async ([id]) => {
      if (!id || events.value.some((event) => event._id === id) || fetchedEvent.value?._id === id) return
      try {
        fetchedEvent.value = await eventsService.getOne(id)
      } catch {
        fetchedEvent.value = null
      }
    },
    { immediate: true },
  )

  watch(
    () => FILTER_KEYS.map((key) => route.query[key]).join('|'),
    () => {
      reload()
      loadFilterOptions()
    },
    { immediate: true },
  )

  return {
    filters,
    activeFilterKeys,
    events,
    total,
    totalCapped,
    loading,
    loadingMore,
    hasMore,
    error,
    overview,
    overviewLoading,
    filterOptions,
    selectedId,
    selectedEvent,
    selectEvent,
    setFilters,
    clearFilters,
    loadMore,
    reload,
  }
}
