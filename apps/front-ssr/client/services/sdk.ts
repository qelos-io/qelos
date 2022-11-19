import * as server from './sdk-server';
import QelosSDK from '@qelos/sdk';

export const {sdk, loadAll} = import.meta.env.SSR
  ? server
  : {
    sdk: new QelosSDK({appUrl: location.origin, fetch: globalThis.fetch.bind(globalThis)}),
    loadAll: (kind: string) => null,
  }

export default sdk;
