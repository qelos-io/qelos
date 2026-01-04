import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import IntegrationSource from '../models/integration-source';
import { IntegrationSourceKind } from '@qelos/global-types';
import { getEncryptedSourceAuthentication } from '../services/source-authentication-service';
import AWS from 'aws-sdk';
import Cloudflare from 'cloudflare';
import { toProviderParams, fromProviderParams, NormalizedFunction } from '../services/lambda-adapter-service';
import logger from '../services/logger';
import fetch from 'node-fetch';

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
        apiToken: auth.apiToken,
    });
}

export async function listFunctions(req: Request, res: Response) {
    try {
        const { sourceId } = req.params;
        const source = await IntegrationSource.findById(sourceId).lean().exec();

        if (!source) {
            throw new ResponseError('Source not found', 404);
        }

        let functions: NormalizedFunction[];
        if (source.kind === IntegrationSourceKind.AWS) {
            const lambda = await getAwsLambdaClient(source);
            const result = await lambda.listFunctions({}).promise();
            functions = result.Functions?.map(f => fromProviderParams(source.kind, f)) || [];
        } else if (source.kind === IntegrationSourceKind.Cloudflare) {
            const cf = await getCloudflareClient(source);
            const result = await cf.workers.scripts.list({ account_id: source.metadata.accountId });
            // ScriptsSinglePage is an array-like object, convert to array if needed
            const functionsArray = Array.isArray(result) ? result : [result];
            functions = functionsArray.map(f => fromProviderParams(source.kind, f));
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.json(functions);
    } catch (error) {
        logger.error('Error listing functions', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error listing functions' });
        }
    }
}

export async function executeFunction(req: Request, res: Response) {
    try {
        const { sourceId, functionName } = req.params;
        const source = await IntegrationSource.findById(sourceId).lean().exec();

        if (!source) {
            throw new ResponseError('Source not found', 404);
        }

        let result;
        if (source.kind === IntegrationSourceKind.AWS) {
            const lambda = await getAwsLambdaClient(source);
            const response = await lambda.invoke({ FunctionName: functionName, Payload: JSON.stringify(req.body) }).promise();
            result = JSON.parse(response.Payload as string);
        } else if (source.kind === IntegrationSourceKind.Cloudflare) {
            const workerUrl = `https://${functionName}.${source.metadata.workersDevSubdomain}.workers.dev`;
            const response = await fetch(workerUrl, {
                method: 'POST',
                body: JSON.stringify(req.body),
                headers: { 'Content-Type': 'application/json' },
            });
            result = await response.json();
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.json(result);
    } catch (error) {
        logger.error('Error executing function', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error executing function' });
        }
    }
}

export async function getFunction(req: Request, res: Response) {
    try {
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
            const result = await cf.workers.scripts.get(source.metadata.accountId, functionName as any);
            func = fromProviderParams(source.kind, result);
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.json(func);
    } catch (error) {
        logger.error('Error getting function', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error getting function' });
        }
    }
}

export async function deleteFunction(req: Request, res: Response) {
    try {
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
            // Cloudflare doesn't have a direct delete method, we update with empty content
            await cf.workers.scripts.update(source.metadata.accountId, functionName as any, { content: '' } as any);
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting function', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error deleting function' });
        }
    }
}

export async function createFunction(req: Request, res: Response) {
    try {
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
            resource = await cf.workers.scripts.update(source.metadata.accountId, normalizedParams.name as any, params);
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.status(201).json(fromProviderParams(source.kind, resource));
    } catch (error) {
        logger.error('Error creating function', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error creating function' });
        }
    }
}

export async function updateFunction(req: Request, res: Response) {
    try {
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
                await lambda.updateFunctionCode({ FunctionName: functionName, ...Code }).promise();
            }

            if (Object.keys(configParams).length > 0) {
                await lambda.updateFunctionConfiguration({ FunctionName: functionName, ...configParams }).promise();
            }
            resource = await lambda.getFunction({ FunctionName: functionName }).promise();
        } else if (source.kind === IntegrationSourceKind.Cloudflare) {
            const cf = await getCloudflareClient(source);
            const params = toProviderParams(source.kind, normalizedParams);
            resource = await cf.workers.scripts.update(source.metadata.accountId, functionName as any, params);
        } else {
            throw new ResponseError('Unsupported source kind', 400);
        }

        res.status(200).json(fromProviderParams(source.kind, resource));
    } catch (error) {
        logger.error('Error updating function', error);
        if (error instanceof ResponseError) {
            res.status(error.status).json({ message: error.responseMessage });
        } else {
            res.status(500).json({ message: 'Error updating function' });
        }
    }
}
