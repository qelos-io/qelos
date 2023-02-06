import {defineStore} from 'pinia';
import {computed, nextTick, ref} from 'vue';
import {useRouter} from 'vue-router';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';

export const useMfeCommunication = defineStore('mfe-communication', function useMfeCommunication() {
  const lastOrigin = ref();
  const iframe = ref();

  const router = useRouter();
  const openModals = ref([]);

  const {modals} = usePluginsMicroFrontends();
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

  function openMfeModal(modalName: string, props: any) {
    const mfe = modals.value[modalName];
    if (!mfe) {
      return;
    }
    openModals.value.push({mfe, props});
  }

  function closeMfeModal(modalName) {
    openModals.value = openModals.value.filter(data => {
      return data.mfe.modal.name !== modalName
    });
  }

  window.addEventListener('message', (event) => {
    const {from, eventName, payload} = event.data || {};

    if (from !== 'qelos-mfe') {
      return;
    }
    switch (eventName) {
      case 'styleInterested':
        dispatch('sharedStyle', document.querySelector('#app-style')?.innerHTML)
        return;
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
    dispatchMfe: dispatch,
    shutdownMfe,
    openMfeModal,
    closeMfeModal
  }
})