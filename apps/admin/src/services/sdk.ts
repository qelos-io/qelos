import QelosAdministratorSDK from '@qelos/sdk/dist/administrator'

const sdk = new QelosAdministratorSDK({
    appUrl: location.origin,
    fetch: globalThis.fetch.bind(globalThis),
})

export default sdk;
