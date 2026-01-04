import BaseSDK from '../base-sdk';
import { QlError } from '../types';

export type ManageLambdasSDK = {
  getList: (sourceId: string) => Promise<any>;
  getLambda: (sourceId: string, functionName: string) => Promise<any>;
  create: (sourceId: string, data: any) => Promise<any>;
  update: (sourceId: string, functionName: string, data: any) => Promise<any>;
  delete: (sourceId: string, functionName: string) => Promise<any>;
};

export default (sdk: BaseSDK): { manageLambdas: ManageLambdasSDK } => ({
  manageLambdas: {
    getList: (sourceId: string) => {
      if (!sourceId) {
        throw new QlError('Source ID is required');
      }
      return sdk.get(`/lambdas/${sourceId}`);
    },
    getLambda: (sourceId: string, functionName: string) => {
      if (!sourceId || !functionName) {
        throw new QlError('Source ID and function name are required');
      }
      return sdk.get(`/lambdas/${sourceId}/${functionName}`);
    },
    create: (sourceId: string, data: any) => {
      if (!sourceId) {
        throw new QlError('Source ID is required');
      }
      return sdk.post(`/lambdas/${sourceId}`, data);
    },
    update: (sourceId: string, functionName: string, data: any) => {
      if (!sourceId || !functionName) {
        throw new QlError('Source ID and function name are required');
      }
      return sdk.put(`/lambdas/${sourceId}/${functionName}`, data);
    },
    delete: (sourceId: string, functionName: string) => {
      if (!sourceId || !functionName) {
        throw new QlError('Source ID and function name are required');
      }
      return sdk.delete(`/lambdas/${sourceId}/${functionName}`);
    },
  },
});