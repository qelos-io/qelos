let qelosHostname;

const callbacks = new Map();

window.addEventListener('message', (event) => {
  if (event.data.qelosHostname) {
    qelosHostname = event.data.qelosHostname;
  }
  if (callbacks.has(event.data.eventName)) {
    callbacks.get(event.data.eventName).forEach(cb => cb(event.data.payload))
  }
})

export function dispatch(eventName: string, payload?: any) {
  postMessage({
    eventName,
    payload
  }, qelosHostname);
}

export function on(eventName: string, callback: (payload: any) => unknown) {
  if (!callbacks.has(eventName)) {
    callbacks.set(eventName, new Set())
  }
  callbacks.get(eventName).add(callback);
}