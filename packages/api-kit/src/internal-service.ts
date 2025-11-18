import axios, { AxiosPromise, AxiosRequestConfig } from 'axios';

import type { Service, ServiceProtocol } from './types';

export function service(name: string, descriptorOverrides: Partial<Service> = {}): (options: AxiosRequestConfig) => AxiosPromise {
  const service = createServiceDescriptor(name, descriptorOverrides);

  return (options) => callInternalService(service, options);
}

function createServiceDescriptor(name: string, descriptorOverrides: Partial<Service> = {}): Service {
  name = name.toUpperCase();

  return {
    protocol: (process.env[`${name}_SERVICE_PROTOCOL`] as ServiceProtocol | undefined) || descriptorOverrides.protocol || 'http',
    url: process.env[`${name}_SERVICE_URL`] || descriptorOverrides.url || '127.0.0.1',
    port: process.env[`${name}_SERVICE_PORT`] || descriptorOverrides.port || 8080,
  };
}

export function callInternalService(service: Service, options: AxiosRequestConfig): AxiosPromise {
  return axios({
    ...options,
    url: `${service.protocol}://${service.url}:${service.port}${options.url}`,
    timeout: options.timeout || 30000, // 30 second default timeout
  });
}
