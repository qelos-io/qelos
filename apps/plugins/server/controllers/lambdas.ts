import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import IntegrationSource from '../models/integration-source';
import { IntegrationSourceKind } from '@qelos/global-types';
import { getEncryptedSourceAuthentication } from '../services/source-authentication-service';
import AWS from 'aws-sdk';
import Cloudflare from 'cloudflare';

const ALLOWED_AWS_CREATE_PARAMS = ['FunctionName', 'Role', 'Handler', 'Runtime', 'Description', 'Timeout', 'MemorySize', 'Environment', 'Code'];
const ALLOWED_AWS_UPDATE_PARAMS = ['FunctionName', 'Role', 'Handler', 'Runtime', 'Description', 'Timeout', 'MemorySize', 'Environment'];
const ALLOWED_AWS_CODE_PARAMS = ['ZipFile', 'S3Bucket', 'S3Key', 'S3ObjectVersion', 'Publish', 'DryRun'];
const ALLOWED_CLOUDFLARE_CREATE_PARAMS = ['name', 'script', 'logpush', 'dispatch_namespaces', 'tags', 'compatibility_date', 'compatibility_flags'];
const ALLOWED_CLOUDFLARE_UPDATE_PARAMS = ['script', 'logpush', 'dispatch_namespaces', 'tags', 'compatibility_date', 'compatibility_flags'];

function sanitize(obj, allowedKeys) {
    return Object.keys(obj).reduce((acc, key) => {
        if (allowedKeys.includes(key)) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
}

async function getAwsLambdaClient(source) {
  const auth = await getEncryptedSourceAuthentication(source.tenant, source.kind, source.authentication);
  return new AWS.Lambda({
    region: source.metadata.region,
    accessKeyId: source.metadata.access_key_id,
    secretAccessKey: auth.secret_access_key,
  });
}

async function getCloudflareClient(source) {
    const auth = await getEncryptedSourceAuthentication(source.tenant, source.kind, source.authentication);
    return new Cloudflare({
        token: auth.api_token,
    });
}

export async function listFunctions(req: Request, res: Response) {
  const { sourceId } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  let functions;
  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const result = await lambda.listFunctions({}).promise();
    functions = result.Functions;
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    functions = await cf.workers.scripts.list({ account_id: source.metadata.account_id });
  } else {
    throw new ResponseError('Unsupported source kind', 400);
  }

  res.json(functions);
}

export async function getFunction(req: Request, res: Response) {
  const { sourceId, functionName } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  let func;
  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const result = await lambda.getFunction({ FunctionName: functionName }).promise();
    func = result.Configuration;
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    func = await cf.workers.scripts.read(source.metadata.account_id, functionName);
  } else {
    throw new ResponseError('Unsupported source kind', 400);
  }

  res.json(func);
}

export async function deleteFunction(req: Request, res: Response) {
  const { sourceId, functionName } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    await lambda.deleteFunction({ FunctionName: functionName }).promise();
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    await cf.workers.scripts.delete(source.metadata.account_id, functionName);
  } else {
    throw new ResponseError('Unsupported source kind', 400);
  }

  res.status(204).send();
}

export async function createFunction(req: Request, res: Response) {
    const { sourceId } = req.params;
    const source = await IntegrationSource.findById(sourceId).lean().exec();

    if (!source) {
        throw new ResponseError('Source not found', 404);
    }

    let resource;
    if (source.kind === IntegrationSourceKind.AWS) {
        const lambda = await getAwsLambdaClient(source);
        const params = sanitize(req.body, ALLOWED_AWS_CREATE_PARAMS);
        resource = await lambda.createFunction(params).promise();
    } else if (source.kind === IntegrationSourceKind.Cloudflare) {
        const cf = await getCloudflareClient(source);
        const params = sanitize(req.body, ALLOWED_CLOUDFLARE_CREATE_PARAMS);
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
            throw new ResponseError('Invalid Cloudflare worker name', 400);
        }
        // The Cloudflare SDK uses the `update` method for both creating and updating workers.
        // If a worker with the given name doesn't exist, it will be created.
        resource = await cf.workers.scripts.update(source.metadata.account_id, name, params);
    } else {
        throw new ResponseError('Unsupported source kind', 400);
    }

    res.status(201).json(resource);
}

export async function updateFunction(req: Request, res: Response) {
  const { sourceId, functionName } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const { Code, ...configParams } = req.body;

    let resource;
    if (Code) {
      const codeParams = sanitize(Code, ALLOWED_AWS_CODE_PARAMS);
      resource = await lambda.updateFunctionCode({ FunctionName: functionName, ...codeParams }).promise();
    }

    const params = sanitize(configParams, ALLOWED_AWS_UPDATE_PARAMS);
    if (Object.keys(params).length > 0) {
      resource = await lambda.updateFunctionConfiguration({ FunctionName: functionName, ...params }).promise();
    }
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    const params = sanitize(req.body, ALLOWED_CLOUDFLARE_UPDATE_PARAMS);
    resource = await cf.workers.scripts.update(source.metadata.account_id, functionName, params);
  } else {
    throw new ResponseError('Unsupported source kind', 400);
  }

  res.status(200).json(resource);
}
