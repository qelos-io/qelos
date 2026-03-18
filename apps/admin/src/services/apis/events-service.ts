import { getCrud } from './crud'
import { api, getCallData } from './api'

export interface IEvent {
  _id: string;
  tenant: string;
  user?: string;
  source: string;
  kind: string;
  eventName: string;
  description: string;
  metadata: any;
  created: Date;
}

export interface IEventsListResponse {
  events: IEvent[];
  total: number;
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
  period?: string;
  from?: string;
  to?: string;
  page?: number;
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
}

export default eventsService
