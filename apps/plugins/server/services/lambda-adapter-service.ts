import { IntegrationSourceKind } from '@qelos/global-types';

export interface NormalizedFunction {
  name: string;
  runtime: string;
  description?: string;
  memorySize?: number;
  timeout?: number;
  // AWS specific
  role?: string;
  handler?: string;
  zipFile?: Buffer;
  // Cloudflare specific
  code?: string;
  entryPoint?: string;
  bindings?: any[];
}

function toAwsParams(params: NormalizedFunction) {
  const awsParams: any = {};
  if (params.name) awsParams.FunctionName = params.name;
  if (params.role) awsParams.Role = params.role;
  if (params.handler) awsParams.Handler = params.handler;
  if (params.runtime) awsParams.Runtime = params.runtime;
  if (params.description) awsParams.Description = params.description;
  if (params.timeout) awsParams.Timeout = params.timeout;
  if (params.memorySize) awsParams.MemorySize = params.memorySize;
  if (params.zipFile) awsParams.Code = { ZipFile: params.zipFile };
  return awsParams;
}

function fromAwsParams(awsParams): NormalizedFunction {
  return {
    name: awsParams.FunctionName,
    runtime: awsParams.Runtime,
    description: awsParams.Description,
    timeout: awsParams.Timeout,
    memorySize: awsParams.MemorySize,
    role: awsParams.Role,
    handler: awsParams.Handler,
  };
}

function toCloudflareParams(params: NormalizedFunction) {
  const cfParams: any = {};
  if (params.name) cfParams.id = params.name;
  if (params.code) cfParams.script = params.code;
  if (params.entryPoint) cfParams.entry_point = params.entryPoint;
  if (params.bindings) cfParams.bindings = params.bindings;
  return cfParams;
}

function fromCloudflareParams(cfParams): NormalizedFunction {
    return {
        name: cfParams.id,
        runtime: 'javascript', // Cloudflare workers are always JS
        code: cfParams.script,
        entryPoint: cfParams.entry_point,
        bindings: cfParams.bindings,
    };
}

export function toProviderParams(kind: IntegrationSourceKind, params: NormalizedFunction) {
  switch (kind) {
    case IntegrationSourceKind.AWS:
      return toAwsParams(params);
    case IntegrationSourceKind.Cloudflare:
      return toCloudflareParams(params);
    default:
      throw new Error(`Unsupported provider: ${kind}`);
  }
}

export function fromProviderParams(kind: IntegrationSourceKind, params: any): NormalizedFunction {
    switch (kind) {
      case IntegrationSourceKind.AWS:
        return fromAwsParams(params);
      case IntegrationSourceKind.Cloudflare:
        return fromCloudflareParams(params);
      default:
        throw new Error(`Unsupported provider: ${kind}`);
    }
  }
