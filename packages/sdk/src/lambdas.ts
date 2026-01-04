import BaseSDK from "./base-sdk";
import { QelosSDKOptions } from "./types";

export default class QlLambdas extends BaseSDK {
    private relativePath = '/api/lambdas';

    constructor(private options: QelosSDKOptions) {
        super(options)
    }

    public execute(sourceId: string, functionName: string, payload: any) {
        return this.callJsonApi(`${this.relativePath}/${sourceId}/${functionName}/execute`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'content-type': 'application/json' },
        });
    }
}