import {QelosSDKOptions} from '../types.js';
import BaseSDK from '../base-sdk.js';

export interface IQelosEvent {
  _id?: string;
  tenant: string;
  user?: string;
  workspace?: string;
  source: string;
  kind: string;
  eventName: string;
  description: string;
  metadata?: any;
  created: Date;
}

/** one page of events, the newest first */
export interface IQelosEventsPage {
  events: IQelosEvent[];
  /** how many events match, up to a cap */
  total: number;
  /** set when more events match than `total` counts */
  totalCapped?: boolean;
  /** counted from 0 */
  page: number;
  limit: number;
  totalPages: number;
}

export default class QlEvents extends BaseSDK {
  private relativePath = '/api/events';

  constructor(options: QelosSDKOptions) {
    super(options)
  }

  getList(params?: { page?: number; limit?: number; kind?: string; eventName?: string; source?: string; user?: string; workspace?: string; search?: string; period?: string; from?: string; to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.kind) queryParams.append('kind', params.kind);
    if (params?.eventName) queryParams.append('eventName', params.eventName);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.user) queryParams.append('user', params.user);
    if (params?.workspace) queryParams.append('workspace', params.workspace);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.period) queryParams.append('period', params.period);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    
    const queryString = queryParams.toString();
    return this.callJsonApi<IQelosEventsPage>(this.relativePath + (queryString ? '?' + queryString : ''));
  }

  getEvent(eventId: string) {
    return this.callJsonApi<IQelosEvent>(this.relativePath + '/' + eventId)
  }

  async dispatch(payload: Partial<IQelosEvent>): Promise<void> {
    await this.callApi(
      this.relativePath,
      {
        method: 'post',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload)
      }
    )
  }
}
