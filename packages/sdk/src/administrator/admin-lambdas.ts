import BaseSDK from "../base-sdk";
import { QelosSDKOptions } from "../types";

export default class QlManageLambdas extends BaseSDK {
    private relativePath = '/api/lambdas';

    constructor(private options: QelosSDKOptions) {
        super(options)
    }

    public getList(sourceId: string) {
        return this.callJsonApi(`${this.relativePath}/${sourceId}`);
    }

    public getLambda(sourceId: string, functionName: string) {
        return this.callJsonApi(`${this.relativePath}/${sourceId}/${functionName}`);
    }

    public create(sourceId: string, data: any) {
        return this.callJsonApi(`${this.relativePath}/${sourceId}`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'content-type': 'application/json' },
        });
    }

    public update(sourceId: string, functionName: string, data: any) {
        return this.callJsonApi(`${this.relativePath}/${sourceId}/${functionName}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'content-type': 'application/json' },
        });
    }

    public remove(sourceId: string, functionName: string) {
        return this.callApi(`${this.relativePath}/${sourceId}/${functionName}`, { method: 'DELETE' });
    }
}