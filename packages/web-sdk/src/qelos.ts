let qelosHostname = '*';

const callbacks = new Map<string, Set<{ callback, once: boolean }>>();

const FROM = 'qelos-mfe';

window.addEventListener('message', (event) => {
  if (event.data.qelosHostname) {
    qelosHostname = event.data.qelosHostname;
  }
  if (callbacks.has(event.data.eventName)) {
    const eventCallbacks = callbacks.get(event.data.eventName);
    eventCallbacks.forEach((item) => {
      item.callback(event.data.payload);
      if (item.once) {
        eventCallbacks.delete(item);
      }
    })
  }
})

export function dispatch(eventName: string, payload?: any) {
  window.parent.postMessage({
    from: FROM,
    eventName,
    payload
  }, qelosHostname);
}

export function on(eventName: string, callback: (payload: any) => unknown, {once} = {once: false}) {
  if (!callbacks.has(eventName)) {
    callbacks.set(eventName, new Set())
  }
  callbacks.get(eventName).add({callback, once: once || false});
}