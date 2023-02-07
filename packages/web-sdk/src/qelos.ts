let qelosHostname = '*';

const callbacks = new Map<string, Set<{ callback, once: boolean }>>();

const FROM = 'qelos-mfe';

function onEventFromHost({eventName, payload}: any = {}) {
  if (callbacks.has(eventName)) {
    const eventCallbacks = callbacks.get(eventName);
    eventCallbacks.forEach((item) => {
      item.callback(payload);
      if (item.once) {
        eventCallbacks.delete(item);
      }
    })
  }
}

window.addEventListener('message', (event) => {
  if (event.data.qelosHostname) {
    qelosHostname = event.data.qelosHostname;
  }
  if(event.data.events instanceof Array) {
    event.data.events.forEach(onEventFromHost);
  }
});

const events = [];

function dispatchEvents() {
  window.parent.postMessage({
    from: FROM,
    events
  }, qelosHostname);
  events.length = 0;
}

export function dispatch(eventName: string, payload?: any) {
  if (!events.length) {
    requestAnimationFrame(dispatchEvents)
  }
  events.push({eventName, payload});
}

export function on(eventName: string, callback: (payload: any) => unknown, {once} = {once: false}) {
  if (!callbacks.has(eventName)) {
    callbacks.set(eventName, new Set())
  }
  callbacks.get(eventName).add({callback, once: once || false});
}