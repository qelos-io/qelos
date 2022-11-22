import {defineStore} from 'pinia';
import {ref} from 'vue';
import {useRouter} from 'vue-router';

export const useMfeCommunication = defineStore('mfe-communication', function useMfeCommunication() {
  const lastOrigin = ref();
  const iframe = ref();

  const router = useRouter();
  const routes = router.getRoutes().map(route => {
    return {
      name: route.name,
      params: route.path
        .split('/')
        .filter(part => part.startsWith(':'))
        .map(part => part.slice(1)),
    }
  })

  function dispatch(eventName: string, payload?: any) {
    iframe.value.contentWindow.postMessage({
      qelosHostname: location.hostname,
      eventName,
      payload,
    }, lastOrigin.value);
  }

  function shutdownMfe() {
    dispatch('shutdown')
  }

  window.addEventListener('message', (event) => {
    const {from, eventName, payload} = event.data || {};

    if (from !== 'qelos-mfe') {
      return;
    }
    switch (eventName) {
      case 'routesInterested':
        dispatch('availableRoutes', routes);
        return;
      case 'changeRoute':
        router.push({name: payload.name, params: payload.params});
        return;
      case '':
    }
  })


  return {
    lastOrigin,
    iframe,
    shutdownMfe
  }
})