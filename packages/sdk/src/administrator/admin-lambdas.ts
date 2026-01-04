import BaseSDK from "../base-sdk";

export default class QlManageLambdas extends BaseSDK {
    public getList(sourceId: string) {
        return this._fetch(`/lambdas/${sourceId}`, { method: 'GET' });
    }

    public getLambda(sourceId: string, functionName: string) {
        return this._fetch(`/lambdas/${sourceId}/${functionName}`, { method: 'GET' });
    }

    public create(sourceId: string, data: any) {
        return this._fetch(`/lambdas/${sourceId}`, { method: 'POST', body: JSON.stringify(data) });
    }

    public update(sourceId: string, functionName: string, data: any) {
        return this._fetch(`/lambdas/${sourceId}/${functionName}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    public delete(sourceId: string, functionName: string) {
        return this._fetch(`/lambdas/${sourceId}/${functionName}`, { method: 'DELETE' });
    }
}
