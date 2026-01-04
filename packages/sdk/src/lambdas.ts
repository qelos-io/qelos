import BaseSDK from "./base-sdk";
import { QelosSDKOptions } from "./types";

export default class QlLambdas extends BaseSDK {
    private relativePath = '/api/webhooks';

    constructor(private options: QelosSDKOptions) {
        super(options)
    }

    public execute(integrationId: string, payload: any) {
        return this.callJsonApi(`${this.relativePath}/${integrationId}`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'content-type': 'application/json' },
        });
    }
}