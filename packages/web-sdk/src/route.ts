import {on} from './qelos';

let currentRoute;
let subscribers;

export function getCurrentRoute() {
  return currentRoute;
}

export function onRouteChanged(callback) {
  if (!subscribers) {
    subscribers = new Set();
  }
  subscribers.add(callback);
}

on('routeChanged', route => {
  currentRoute = route;
  if (subscribers && subscribers.size) {
    subscribers.forEach(cb => cb(currentRoute))
  }
});