import {QelosSDKOptions} from '../types';
import BaseSDK from '../base-sdk';

export interface IQelosEvent {
  tenant: string;
  user?: string;
  source: string;
  kind: string;
  eventName: string;
  description: string;
  metadata?: any;
  created: Date;
}

export default class QlEvents extends BaseSDK {
  private relativePath = '/api/events';

  constructor(options: QelosSDKOptions) {
    super(options)
  }

  getList({page}: { page?: number } = {}) {
    return this.callJsonApi<IQelosEvent[]>(this.relativePath + (page ? ('?page=' + page) : ''));
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
