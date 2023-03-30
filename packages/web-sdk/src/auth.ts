import {dispatch, on} from './qelos';

let subscribers;

let currentCode = (new URL(location.href)).searchParams.get('code') || 'default';

export function getCode() {
  return currentCode;
}

export function onReAuthorize(callback) {
  if (!subscribers) {
    subscribers = new Set();
  }
  subscribers.add(callback);
}

export function reAuthorize() {
  dispatch('reAuthorize', {returnUrl: location.href});
}


on('reAuthorize', async ({code, token}) => {
  currentCode = code;
  const data = await callAuthorize({returnUrl: location.href, token});
  if (subscribers && subscribers.size) {
    subscribers.forEach(cb => cb(data))
  }
});


export async function unAuthorize() {
  await fetch('/api/un-authorize', {
    method: 'post',
    headers: {
      code: currentCode
    },
  })
}

export async function authorize() {
  const returnUrl = location.href.replace(location.search, '');
  const token = (new URL(location.href)).searchParams.get('token');

  window.addEventListener('beforeunload', unAuthorize);
  on('shutdown', unAuthorize);


  return callAuthorize({returnUrl, token})
}

async function callAuthorize({returnUrl, token}) {
  const res = await fetch('/api/authorize', {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      returnUrl,
      token
    })
  })

  return res.json();
}