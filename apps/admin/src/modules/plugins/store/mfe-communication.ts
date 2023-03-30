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

  const events = [];

  function dispatchEvents() {
    if (!iframe.value) {
      events.length = 0;
      return;
    }

    iframe.value.contentWindow.postMessage({
      qelosHostname: location.origin,
      events,
    }, lastOrigin.value);
    events.length = 0;
  }

  async function dispatch(eventName: string, payload?: any, {immediate = false} = {}) {
    if (immediate && iframe.value) {
      events.push({eventName, payload});
      dispatchEvents();
      return;
    }
    if (!iframe.value) {
      await nextTick();
    }
    if (!events.length) {
      requestAnimationFrame(dispatchEvents)
    }
    events.push({eventName, payload});
  }

  function shutdownMfe() {
    dispatch('shutdown', null, {immediate: true});
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

  function triggerRouteChanged() {
    const {matched, ...simpleData} = router.currentRoute.value
    const cloned = JSON.parse(JSON.stringify(simpleData))
    dispatch('routeChanged', cloned);
  }

  async function reAuthorize({returnUrl}) {
    const url = new URL(router.currentRoute.value.meta.mfeUrl as string);

    url.searchParams.delete('returnUrl')
    url.searchParams.set('returnUrl', returnUrl);

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (res.status === 200) {
      const data = await res.json();
      dispatch('reAuthorize', data);
    }
  }

  function onEventFromMfe({eventName, payload}) {
    switch (eventName) {
      case 'styleInterested':
        dispatch('sharedStyle', document.querySelector('#app-style')?.innerHTML)
        return;
      case 'routeChangedInterested':
        triggerRouteChanged();
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
      case 'reAuthorize':
        reAuthorize(payload);
        return;
    }
  }

  window.addEventListener('message', (event) => {
    const {from, events} = event.data || {};

    if (from !== 'qelos-mfe') {
      return;
    }
    if (events instanceof Array) {
      events.forEach(onEventFromMfe);
    }
  }, false)

  return {
    lastOrigin,
    iframe,
    triggerRouteChanged,
    shutdownMfe,
    openMfeModal,
    closeMfeModal
  }
})