import {dispatch, on} from './qelos';

let availableRoutes;

export function getAvailableRoutes() {
  return availableRoutes;
}

export function changeRoute(routeName: string, params: any) {
  dispatch('changeRoute', {routeName, params})
}

dispatch('routesInterested');
on('availableRoutes', routes => availableRoutes = routes)