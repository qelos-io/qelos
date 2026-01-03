import { QelosSDKOptions } from "../types";
import BaseSDK from "../base-sdk";

export default function QlAdminLambdas(options: QelosSDKOptions) {
    const client = new BaseSDK(options);
    return {
        list: (sourceId: string) => client.get(`/lambdas/${sourceId}`),
        get: (sourceId: string, functionName: string) => client.get(`/lambdas/${sourceId}/${functionName}`),
        create: (sourceId: string, data: any) => client.post(`/lambdas/${sourceId}`, data),
        update: (sourceId: string, functionName: string, data: any) => client.put(`/lambdas/${sourceId}/${functionName}`, data),
        delete: (sourceId: string, functionName: string) => client.del(`/lambdas/${sourceId}/${functionName}`),
    }
}
