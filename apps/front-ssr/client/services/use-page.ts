import {usePayload} from '../entry/core';
import {LayoutItem} from '../components/types/layout';
import {IAppConfiguration} from '@qelos/sdk/dist/configurations';

export function usePage(kind: string) {
  const [payload, config] = usePayload() as [
    payload: { layout: LayoutItem[], connectedData: any[] },
    appConfiguration: IAppConfiguration
  ];
  return {payload, config, kind}
}