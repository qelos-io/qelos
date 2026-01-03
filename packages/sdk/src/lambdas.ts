import { QelosSDKOptions } from "./types";
import BaseSDK from "./base-sdk";

export default function QlLambdas(options: QelosSDKOptions) {
    const client = new BaseSDK(options);
    return {
        execute: (sourceId: string, functionName: string, payload: any) => client.post(`/lambdas/${sourceId}/${functionName}/execute`, payload),
    }
}
