import { getCrud } from './crud'
import { api, getCallData } from './api'

export interface IEvent {
  _id: string;
  tenant: string;
  user?: string | { _id?: string; email?: string; username?: string };
  workspace?: string | { _id?: string; name?: string };
  source: string;
  kind: string;
  eventName: string;
  description: string;
  metadata: any;
  created: Date | string;
}

export interface IEventsListResponse {
  events: IEvent[];
  total: number;
  totalCapped?: boolean;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IEventsFilterOptions {
  kinds: string[];
  eventNames: string[];
  sources: string[];
}

export interface IEventsQueryParams {
  kind?: string;
  eventName?: string;
  source?: string;
  user?: string;
  workspace?: string;
  search?: string;
  period?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface IEventsOverviewBucket {
  start: string;
  end: string;
  count: number;
  errors: number;
}

export interface IEventsOverview {
  buckets: IEventsOverviewBucket[];
  kinds: { kind: string; count: number; errors: number }[];
  total: number;
  errors: number;
}

export interface IEventsCountResponse {
  count: number;
}

export interface IEventsSumResponse {
  sum: number;
}

export interface IEventsGroupedSumResponse {
  groups: { group: string | null; sum: number }[];
  sum: number;
}

const crud = getCrud<IEvent>('/api/events')

const eventsService = {
  ...crud,
  getAll(params?: IEventsQueryParams): Promise<IEventsListResponse> {
    return api.get('/api/events', { params }).then(getCallData)
  },
  getFilterOptions(params?: IEventsQueryParams): Promise<IEventsFilterOptions> {
    return api.get('/api/events/filter-options', { params }).then(getCallData)
  },
  getOverview(params?: IEventsQueryParams & { buckets?: number }): Promise<IEventsOverview> {
    // optional enrichment: never let a slow or missing endpoint block the page
    return api.get('/api/events/overview', { params, timeout: 5000 }).then(getCallData)
  },
  getCount(params?: IEventsQueryParams & { 'no-cache'?: string }): Promise<IEventsCountResponse> {
    return api.get('/api/events/count', { params }).then(getCallData)
  },
  getSum(
    params: IEventsQueryParams & {
      sum: string;
      groupBy?: string;
      'no-cache'?: string;
    },
  ): Promise<IEventsSumResponse | IEventsGroupedSumResponse> {
    return api.get('/api/events/sum', { params }).then(getCallData)
  },
}

export default eventsService
