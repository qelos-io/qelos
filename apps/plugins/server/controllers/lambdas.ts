import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import IntegrationSource from '../models/integration-source';
import { IntegrationSourceKind } from '@qelos/global-types';
import { getEncryptedSourceAuthentication } from '../services/source-authentication-service';
import AWS from 'aws-sdk';
import Cloudflare from 'cloudflare';
import { toProviderParams, fromProviderParams, NormalizedFunction } from '../services/lambda-adapter-service';

async function getAwsLambdaClient(source) {
  const auth = await getEncryptedSourceAuthentication(source.tenant, source.kind, source.authentication);
  return new AWS.Lambda({
    region: source.metadata.region,
    accessKeyId: source.metadata.accessKeyId,
    secretAccessKey: auth.secretAccessKey,
  });
}

async function getCloudflareClient(source) {
    const auth = await getEncryptedSourceAuthentication(source.tenant, source.kind, source.authentication);
    return new Cloudflare({
        token: auth.apiToken,
    });
}

export async function listFunctions(req: Request, res: Response) {
  const { sourceId } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  let functions: NormalizedFunction[];
  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const result = await lambda.listFunctions({}).promise();
    functions = result.Functions.map(f => fromProviderParams(source.kind, f));
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    const result = await cf.workers.scripts.list({ account_id: source.metadata.accountId });
    functions = result.map(f => fromProviderParams(source.kind, f));
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

  let func: NormalizedFunction;
  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const result = await lambda.getFunction({ FunctionName: functionName }).promise();
    func = fromProviderParams(source.kind, result.Configuration);
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    const result = await cf.workers.scripts.read(source.metadata.accountId, functionName);
    func = fromProviderParams(source.kind, result);
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
    await cf.workers.scripts.delete(source.metadata.accountId, functionName);
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
    const normalizedParams: NormalizedFunction = req.body;

    if (source.kind === IntegrationSourceKind.AWS) {
        const lambda = await getAwsLambdaClient(source);
        const params = toProviderParams(source.kind, normalizedParams);
        resource = await lambda.createFunction(params).promise();
    } else if (source.kind === IntegrationSourceKind.Cloudflare) {
        const cf = await getCloudflareClient(source);
        const params = toProviderParams(source.kind, normalizedParams);
        if (!normalizedParams.name || typeof normalizedParams.name !== 'string' || normalizedParams.name.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(normalizedParams.name)) {
            throw new ResponseError('Invalid Cloudflare worker name', 400);
        }
        resource = await cf.workers.scripts.update(source.metadata.accountId, normalizedParams.name, params);
    } else {
        throw new ResponseError('Unsupported source kind', 400);
    }

    res.status(201).json(fromProviderParams(source.kind, resource));
}

export async function updateFunction(req: Request, res: Response) {
  const { sourceId, functionName } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  let resource;
  const normalizedParams: NormalizedFunction = req.body;

  if (source.kind === IntegrationSourceKind.AWS) {
    const lambda = await getAwsLambdaClient(source);
    const params = toProviderParams(source.kind, normalizedParams);
    const { Code, ...configParams } = params;

    if (Code) {
      resource = await lambda.updateFunctionCode({ FunctionName: functionName, ...Code }).promise();
    }

    if (Object.keys(configParams).length > 0) {
      resource = await lambda.updateFunctionConfiguration({ FunctionName: functionName, ...configParams }).promise();
    }
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    const cf = await getCloudflareClient(source);
    const params = toProviderParams(source.kind, normalizedParams);
    resource = await cf.workers.scripts.update(source.metadata.accountId, functionName, params);
  } else {
    throw new ResponseError('Unsupported source kind', 400);
  }

  res.status(200).json(fromProviderParams(source.kind, resource));
}
