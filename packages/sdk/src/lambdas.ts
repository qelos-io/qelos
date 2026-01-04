import BaseSDK from "./base-sdk";
import { QelosSDKOptions } from "./types";

export default class QlLambdas extends BaseSDK {
  private relativePath = '/api/webhooks';

  constructor(private options: QelosSDKOptions) {
    super(options)
  }

  execute(integrationId: string, data?: RequestInit) {
    return this.callJsonApi(`${this.relativePath}/${integrationId}`, data);
  }

  get(integrationId: string, data?: RequestInit) {
    return this.callJsonApi(`${this.relativePath}/${integrationId}`, data);
  }

  post(integrationId: string, data?: RequestInit) {
    return this.callJsonApi(`${this.relativePath}/${integrationId}`, {
      method: 'POST',
      body: data?.body ? JSON.stringify(data?.body) : undefined,
      headers: { 'content-type': 'application/json' },
    });
  }

  put(integrationId: string, data?: RequestInit) {
    return this.callJsonApi(`${this.relativePath}/${integrationId}`, {
      method: 'PUT',
      body: data?.body ? JSON.stringify(data?.body) : undefined,
      headers: { 'content-type': 'application/json' },
    });
  }

  delete(integrationId: string, data?: RequestInit) {
    return this.callJsonApi(`${this.relativePath}/${integrationId}`, {
      ...data,
      method: 'DELETE',
    });
  }
}