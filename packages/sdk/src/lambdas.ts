import  BaseSDK from './base-sdk';

export class LambdasSDK extends BaseSDK {
    public execute(sourceId: string, functionName: string, payload: any) {
        return this.post(`/lambdas/${sourceId}/${functionName}/execute`, payload);
    }
}
