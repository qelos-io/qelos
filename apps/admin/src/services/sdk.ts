import QelosAdministratorSDK from '@qelos/sdk/administrator'

const sdk = new QelosAdministratorSDK({
    appUrl: location.origin,
    fetch: globalThis.fetch.bind(globalThis),
})

export default sdk;
