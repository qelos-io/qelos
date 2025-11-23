import { api, getCallData } from './api';
import type { IDataManipulationStep } from '@qelos/global-types';

export interface ExecuteDataManipulationPayload {
  payload: Record<string, any>;
  workflow: IDataManipulationStep[];
}

export function executeDataManipulationTest({ payload, workflow }: ExecuteDataManipulationPayload) {
  return api
    .post('/api/data-manipulation', { payload, workflow })
    .then(getCallData);
}
