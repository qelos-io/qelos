import {defineStore} from 'pinia';
import {computed, nextTick, ref} from 'vue';
import {useRouter} from 'vue-router';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';

export const useMfeCommunication = defineStore('mfe-communication', function useMfeCommunication() {
  const lastOrigin = ref();
  const iframe = ref();

  const router = useRouter();
  const {modals, openMfeModal} = usePluginsMicroFrontends();
  const routes = router.getRoutes().map(route => {
    return {
      name: route.name,
      params: route.path
        .split('/')
        .filter(part => part.startsWith(':'))
        .map(part => part.slice(1)),
    }
  })
  const availableModals = computed(() => Object.keys(modals.value).reduce((map, modalName) => {
    map[modalName] = {
      name: modalName,
      params: modals.value[modalName].params,
    }
    return map;
  }, {}))

  async function dispatch(eventName: string, payload?: any) {
    if (!iframe.value) {
      await nextTick();
    }
    iframe.value.contentWindow.postMessage({
      qelosHostname: location.origin,
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
        router.push({name: payload.routeName, params: payload.params});
        return;
      case 'modalsInterested':
        dispatch('availableModals', availableModals.value);
        return;
      case 'openModal':
        openMfeModal(payload.openModal, payload.props);
        return;
    }
  }, false)


  return {
    lastOrigin,
    iframe,
    shutdownMfe
  }
})