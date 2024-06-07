export interface IEventSubscriber {
  source?: string,
  kind?: string,
  eventName?: string,
  hookUrl: string;
}