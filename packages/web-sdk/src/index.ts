import {on} from './qelos';

export const code = (new URL(location.href)).searchParams.get('code') || 'default';

export async function unAuthorize() {
  await fetch('/api/un-authorize', {
    method: 'post',
    headers: {
      code
    },
  })
}

export async function authorize() {
  const returnUrl = location.href.replace(location.search, '');
  const token = (new URL(location.href)).searchParams.get('token');

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

  window.addEventListener('beforeunload', unAuthorize);
  on('shutdown', unAuthorize);

  return res.json();
}