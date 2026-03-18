import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDispatcher } from '../../core/compositions/dispatcher'
import eventsService, { IEvent, IEventsListResponse, IEventsFilterOptions } from '@/services/apis/events-service'

interface Filters {
  kind?: string
  eventName?: string
  source?: string
  period?: string
  from?: string
  to?: string
  page?: number
}

function queryParams(route: ReturnType<typeof useRoute>) {
  return {
    kind: (route.query.kind as string) || undefined,
    eventName: (route.query.eventName as string) || undefined,
    source: (route.query.source as string) || undefined,
    period: (route.query.period as string) || 'last-week',
    from: (route.query.from as string) || undefined,
    to: (route.query.to as string) || undefined,
    page: route.query.page ? Number(route.query.page) : 0,
  }
}

export function useEventsList() {
  const route = useRoute()
  const router = useRouter()

  const kind = computed(() => (route.query.kind as string) || undefined)
  const eventName = computed(() => (route.query.eventName as string) || undefined)
  const source = computed(() => (route.query.source as string) || undefined)
  const period = computed(() => (route.query.period as string) || 'last-week')
  const from = computed(() => (route.query.from as string) || undefined)
  const to = computed(() => (route.query.to as string) || undefined)
  const page = computed(() => (route.query.page ? Number(route.query.page) : 0))

  function updateFilters(filters: Filters) {
    router.push({
      query: {
        ...route.query,
        kind: filters.kind || undefined,
        eventName: filters.eventName || undefined,
        source: filters.source || undefined,
        period: filters.period || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page:
          filters.page !== undefined && !Number.isNaN(filters.page)
            ? filters.page.toString()
            : undefined,
      },
    })
  }

  const filterOptions = ref<IEventsFilterOptions>({ kinds: [], eventNames: [], sources: [] })
  const filterOptionsLoading = ref(false)

  const { result: listResult, retry, loading } = useDispatcher<IEventsListResponse>(
    () => {
      const params = queryParams(route)
      return eventsService.getAll({
        kind: kind.value || '*',
        eventName: eventName.value || '*',
        source: source.value || '*',
        period: period.value,
        from: from.value,
        to: to.value,
        page: page.value,
      })
    },
    [],
  )

  const events = computed(() => listResult.value?.events ?? [])
  const total = computed(() => listResult.value?.total ?? 0)
  const totalPages = computed(() => listResult.value?.totalPages ?? 0)
  const limit = computed(() => listResult.value?.limit ?? 50)

  async function loadFilterOptions() {
    filterOptionsLoading.value = true
    try {
      const params = queryParams(route)
      const opts = await eventsService.getFilterOptions({
        kind: params.kind || '*',
        eventName: params.eventName || '*',
        source: params.source || '*',
        period: params.period,
        from: params.from,
        to: params.to,
      })
      filterOptions.value = opts
    } finally {
      filterOptionsLoading.value = false
    }
  }

  const uniqueKinds = computed(() => filterOptions.value.kinds)
  const uniqueEventNames = computed(() => filterOptions.value.eventNames)
  const uniqueSources = computed(() => filterOptions.value.sources)

  watch([kind, eventName, source, period, from, to, page], retry)
  watch([period, from, to], () => loadFilterOptions(), { immediate: true })

  return {
    events,
    loading,
    total,
    totalPages,
    limit,
    updateFilters,
    uniqueKinds,
    uniqueEventNames,
    uniqueSources,
    filterOptionsLoading,
    loadFilterOptions,
    filters: {
      kind,
      eventName,
      source,
      period,
      from,
      to,
      page,
    },
  }
}
