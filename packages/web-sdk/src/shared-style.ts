import {dispatch, on} from './qelos';

export default function loadStyles() {
  dispatch('styleInterested');
  on('sharedStyle', css => {
    if (!css) {
      return;
    }
    let appStyle = document.querySelector('#app-style');
    if (!appStyle) {
      appStyle = document.createElement('style');
      appStyle.setAttribute('id', 'app-style');
      document.body.prepend(appStyle);
    }
    appStyle.innerHTML = css;
  }, {once: true})
}