import BaseSDK from './base-sdk';
import { QlError } from './types';

export type LambdasSDK = {
  execute: (sourceId: string, functionName: string, payload: any) => Promise<any>;
};

export default (sdk: BaseSDK): { lambdas: LambdasSDK } => ({
  lambdas: {
    execute: (sourceId: string, functionName: string, payload: any) => {
      if (!sourceId || !functionName) {
        throw new QlError('Source ID and function name are required');
      }
      return sdk.post(`/lambdas/${sourceId}/${functionName}/execute`, payload);
    },
  },
});