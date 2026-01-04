import BaseSDK from "./base-sdk";

export default class QlLambdas extends BaseSDK {
    public execute(sourceId: string, functionName: string, payload: any) {
        return this._fetch(`/lambdas/${sourceId}/${functionName}/execute`, { method: 'POST', body: JSON.stringify(payload) });
    }
}
