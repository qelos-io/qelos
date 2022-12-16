import {authorize, code} from '@qelos/web-sdk'

(async function () {
  const {user, tenant} = await authorize()

  console.log(user, tenant)

  const res = await fetch('/api/example', {
    method: 'post',
    headers: {code}
  })
  const data = await res.json();
  document.body.innerHTML = `<textarea>${JSON.stringify(data)}</textarea>`;
})()

