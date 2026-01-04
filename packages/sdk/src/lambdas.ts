import BaseSDK from "./base-sdk";

export default class QlLambdas extends BaseSDK {
    public execute(sourceId: string, functionName: string, payload: any) {
        return this.post(`/lambdas/${sourceId}/${functionName}/execute`, payload);
    }
}
