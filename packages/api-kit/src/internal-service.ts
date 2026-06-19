import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import type { Service, ServiceProtocol } from './types';

const DEFAULT_TIMEOUT = parseInt(process.env.INTERNAL_SERVICE_TIMEOUT, 10) || 30000;
const DEFAULT_MAX_RETRIES = parseInt(process.env.INTERNAL_SERVICE_RETRIES, 10) || 3;
const DEFAULT_RETRY_DELAY = parseInt(process.env.INTERNAL_SERVICE_RETRY_DELAY, 10) || 200;

interface InternalServiceOptions extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
  retryableStatusCodes?: number[];
}

function isRetryable(error: any, retryableStatusCodes: number[]): boolean {
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ECONNRESET') return true;
  if (retryableStatusCodes.length && error.response && retryableStatusCodes.includes(error.response.status)) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function service(name: string, descriptorOverrides: Partial<Service> = {}): (options: InternalServiceOptions) => Promise<AxiosResponse> {
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

export async function callInternalService(service: Service, options: InternalServiceOptions): Promise<AxiosResponse> {
  const {
    retries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryableStatusCodes = [],
    timeout = DEFAULT_TIMEOUT,
    ...axiosOptions
  } = options;

  const method = options.method || 'GET';
  const url = `${service.protocol}://${service.url}:${service.port}${options.url}`;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios({ ...axiosOptions, url, timeout });
    } catch (error: any) {
      lastError = error;

      if (attempt < retries && isRetryable(error, retryableStatusCodes)) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`[api-kit] ${method} ${options.url} failed (attempt ${attempt + 1}/${retries + 1}): ${error.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (error.code === 'ECONNABORTED') {
        console.error(`[api-kit] ${method} ${options.url} timed out after ${timeout}ms`);
      }

      throw error;
    }
  }

  throw lastError;
}
