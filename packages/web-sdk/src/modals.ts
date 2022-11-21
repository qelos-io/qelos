import {dispatch, on} from './qelos';

let availableModals;

export function getAvailableModals() {
  return availableModals
}

export function openModal(modalName: string, props: any) {
  dispatch('openModal', {modalName, props})
}

export function closeModal(modalName: string) {
  dispatch('closeModal', {modalName})
}

dispatch('modalsInterested');
on('availableModals', modals => availableModals = modals)