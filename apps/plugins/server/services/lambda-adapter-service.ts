import { IntegrationSourceKind } from '@qelos/global-types';

function toAwsParams(params) {
  const awsParams: any = {};
  if (params.name) awsParams.FunctionName = params.name;
  if (params.role) awsParams.Role = params.role;
  if (params.handler) awsParams.Handler = params.handler;
  if (params.runtime) awsParams.Runtime = params.runtime;
  if (params.description) awsParams.Description = params.description;
  if (params.timeout) awsParams.Timeout = params.timeout;
  if (params.memorySize) awsParams.MemorySize = params.memorySize;
  if (params.environment) awsParams.Environment = { Variables: params.environment };
  if (params.zipFile) awsParams.Code = { ZipFile: params.zipFile };
  return awsParams;
}

function fromAwsParams(awsParams) {
  const params: any = {};
  if (awsParams.FunctionName) params.name = awsParams.FunctionName;
  if (awsParams.Role) params.role = awsParams.Role;
  if (awsParams.Handler) params.handler = awsParams.Handler;
  if (awsParams.Runtime) params.runtime = awsParams.Runtime;
  if (awsParams.Description) params.description = awsParams.Description;
  if (awsParams.Timeout) params.timeout = awsParams.Timeout;
  if (awsParams.MemorySize) params.memorySize = awsParams.MemorySize;
  if (awsParams.Environment) params.environment = awsParams.Environment.Variables;
  return params;
}

function toCloudflareParams(params) {
  const cfParams: any = {};
  if (params.name) cfParams.name = params.name;
  if (params.code) cfParams.script = params.code;
  if (params.entryPoint) cfParams.entry_point = params.entryPoint;
  if (params.bindings) cfParams.bindings = params.bindings;
  return cfParams;
}

function fromCloudflareParams(cfParams) {
  const params: any = {};
  if (cfParams.id) params.name = cfParams.id;
  if (cfParams.script) params.code = cfParams.script;
  if (cfParams.entry_point) params.entryPoint = cfParams.entry_point;
  if (cfParams.bindings) params.bindings = cfParams.bindings;
  return params;
}

export function toProviderParams(kind: IntegrationSourceKind, params: any) {
  switch (kind) {
    case IntegrationSourceKind.AWS:
      return toAwsParams(params);
    case IntegrationSourceKind.Cloudflare:
      return toCloudflareParams(params);
    default:
      throw new Error(`Unsupported provider: ${kind}`);
  }
}

export function fromProviderParams(kind: IntegrationSourceKind, params: any) {
    switch (kind) {
      case IntegrationSourceKind.AWS:
        return fromAwsParams(params);
      case IntegrationSourceKind.Cloudflare:
        return fromCloudflareParams(params);
      default:
        throw new Error(`Unsupported provider: ${kind}`);
    }
  }
