import BaseSDK from "../base-sdk";

export default class QlAdminLambdas extends BaseSDK {
    public getList(sourceId: string) {
        return this.get(`/lambdas/${sourceId}`);
    }

    public get(sourceId: string, functionName: string) {
        return this.get(`/lambdas/${sourceId}/${functionName}`);
    }

    public create(sourceId: string, data: any) {
        return this.post(`/lambdas/${sourceId}`, data);
    }

    public update(sourceId: string, functionName: string, data: any) {
        return this.put(`/lambdas/${sourceId}/${functionName}`, data);
    }

    public delete(sourceId: string, functionName: string) {
        return this.del(`/lambdas/${sourceId}/${functionName}`);
    }
}
