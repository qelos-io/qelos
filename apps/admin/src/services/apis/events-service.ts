import { getCrud } from './crud'

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

const eventsService = getCrud<IEvent>('/api/events')

export default eventsService
