import EventEmitter from 'events';

import { IEvent } from '../models/event';

class HooksEmitter extends EventEmitter {
}

export const hookEvents = new HooksEmitter();

export function emitPlatformEvent(event: IEvent) {
  hookEvents.emit('hook', event);
}
