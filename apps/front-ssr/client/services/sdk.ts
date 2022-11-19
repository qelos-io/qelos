import * as server from './sdk-server';
import GreenpressSDK from '@greenpress/sdk';

export const {sdk, loadAll} = import.meta.env.SSR
  ? server
  : {
    sdk: new GreenpressSDK({appUrl: location.origin, fetch: globalThis.fetch.bind(globalThis)}),
    loadAll: (kind: string) => null,
  }

export default sdk;
