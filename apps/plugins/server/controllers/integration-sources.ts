
import { ResponseError } from '@qelos/api-kit';
import IntegrationSource from '../models/integration-source';
import Plugin from '../models/plugin';
import logger from '../services/logger';
import {
  getEncryptedSourceAuthentication,
  removeEncryptedSourceAuthentication,
  storeEncryptedSourceAuthentication
} from '../services/source-authentication-service';
import { validateSourceMetadata } from '../services/source-metadata-service';
import { callIntegrationTarget } from '../services/integration-target-call';
import { isValidObjectId, Types } from 'mongoose';
import { IntegrationSourceKind } from '@qelos/global-types';
import uniqid from 'uniqid';
import Webhook from '../models/webhook';
import { IIntegrationEntity } from '../models/integration';

const PUBLIC_FIELDS = '-authentication';

export async function createWebhook(req, res) {
  const { sourceId } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  if (source.kind !== IntegrationSourceKind.Qelos) {
    throw new ResponseError('Unsupported source kind', 400);
  }

  const webhookId = uniqid();
  const webhook = new Webhook({
    sourceId,
    webhookId,
    tenant: req.headers.tenant,
  });
  await webhook.save();

  const webhookUrl = `https://${req.headers.host}/api/integration-sources/${sourceId}/trigger-webhook/${webhookId}`;

  res.json({ webhookUrl });
}

export async function triggerWebhook(req, res) {
  const { webhookId } = req.params;
  const { payload, operation, details } = req.body;

  const webhook = await Webhook.findOne({ webhookId }).lean().exec();

  if (!webhook) {
    throw new ResponseError('Webhook not found', 404);
  }

  const target: IIntegrationEntity = {
    source: new Types.ObjectId(webhook.sourceId),
    operation,
    details,
  };

  await callIntegrationTarget(webhook.tenant, payload, target);

  res.status(200).send();
}

export async function getAllIntegrationSources(req, res) {
  const query = { tenant: req.headers.tenant };

  if (req.query.kind) {
    query['kind'] = req.query.kind.toString();
  }
  try {
    const sources = await IntegrationSource
      .find(query)
      .select(PUBLIC_FIELDS)
      .lean()
      .exec()

    res.json(sources).end();
  } catch {
    res.status(500).json({ message: 'could not get integration sources' }).end();
  }
}

export async function getIntegrationSource(req, res) {
  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .select(PUBLIC_FIELDS)
      .lean()
      .exec()

    if (!source) {
      res.status(404).end();
      return;
    }

    res.json(source).end();
  } catch {
    res.status(500).json({ message: 'could not get integration source' }).end();
  }
}

export async function getInternalIntegrationSource(req, res) {
  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .lean()
      .exec()

    if (!source) {
      res.status(404).end();
      return;
    }

    res.json({
      ...source,
      authentication: await getEncryptedSourceAuthentication(req.headers.tenant, source.kind, source.authentication)
    }).end();
  } catch {
    res.status(500).json({ message: 'could not get integration source' }).end();
  }
}

export async function createIntegrationSource(req, res) {
  const { authentication, name, labels, kind, metadata } = req.body;

  const userId = req.user._id;
  const plugin = await Plugin.findOne({ tenant: req.headers.tenant, user: userId }).select('_id').lean().exec();

  let validatedMetadata, authId;
  try {
    validatedMetadata = await validateSourceMetadata(kind, metadata);
  } catch (err) {
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
    } else {
      res.status(400).json({ message: 'invalid metadata' }).end();
    }
    return;
  }

  try {
    authId = await storeEncryptedSourceAuthentication(req.headers.tenant, kind, authentication);
  } catch {
    res.status(400).json({ message: 'invalid authentication data for kind: ' + kind }).end();
    return;
  }


  const source = new IntegrationSource({
    tenant: req.headers.tenant,
    name,
    labels,
    kind,
    metadata: validatedMetadata,
    user: userId,
    plugin: plugin?._id,
    authentication: authId,
  });

  try {
    await source.save();
    const { authentication, ...permittedData } = source.toObject();
    res.json(permittedData).end();
  } catch (err) {
    logger.error('could not create integration source', err);
    if (authId) {
      storeEncryptedSourceAuthentication(req.headers.tenant, kind, null).catch();
    }
    res.status(500).json({ message: 'could not create integration source' }).end();
  }
}

/*
body: {
  name: 'my source',
  labels: ['label1', 'label2'],
  kind: 'linkedin',
  metadata: { clientId: string, scope: string },
  authentication: { clientSecret: string }
}
*/

export async function updateIntegrationSource(req, res) {
  const { authentication, name, labels, metadata } = req.body;

  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .exec()

    if (!source) {
      res.status(404).end();
      return;
    }

    if (name && name !== source.name) {
      source.name = name;
    }
    if (labels) {
      source.labels = labels;
    }

    if (metadata) {
      const validatedMetadata = (await validateSourceMetadata(source.kind, metadata)) || source.metadata;
      source.metadata = validatedMetadata;
    }

    if (typeof authentication === 'object' && Object.keys(authentication).length) {
      const kind = source.kind;
      const newAuthId = await storeEncryptedSourceAuthentication(req.headers.tenant, kind, authentication);

      if (newAuthId) {
        // remove old authentication
        storeEncryptedSourceAuthentication(req.headers.tenant, kind, null, source.authentication).catch();
        source.authentication = newAuthId;
      }
    }

    if (source.isModified()) {
      await source.save();
    }
    const { authentication: _, ...permittedData } = source.toObject();

    res.json(permittedData).end();
  } catch (err) {
    logger.error('could not update integration source', err);
    res.status(500).json({ message: 'could not update integration source' }).end();
  }
}

export async function removeIntegrationSource(req, res) {
  try {
    const query = { _id: req.params.sourceId, tenant: req.headers.tenant };
    const source = await IntegrationSource
      .findOne(query)
      .lean()
      .exec()

    if (!source) {
      res.status(404).json({ message: 'integration source not found' }).end();
      return;
    }
    const { authentication, ...permittedData } = source;

    if (authentication && typeof authentication === 'string') {

      await removeEncryptedSourceAuthentication(req.headers.tenant, source.kind, authentication);
    } else {

      res.status(400).json({ message: 'Authentication is not a valid string' }).end();
      return;
    }

    await IntegrationSource.deleteOne(query).exec();
    res.json(permittedData).end();
  } catch  {

    res.status(500).json({ message: 'could not delete integration source' }).end();
  }
}

export async function triggerIntegrationSource(req, res) {
  try {
    const sourceId: string = req.params.sourceId;
    const { payload, operation, details } = req.body as { payload: any, operation: string, details: any };
    const tenant = req.headers.tenant as string;

    if (!isValidObjectId(sourceId)) {
      res.status(400).json({ message: 'invalid source id' }).end();
      return;
    }
    if (!operation || typeof operation !== 'string') {
      res.status(400).json({ message: 'operation is required' }).end();
      return;
    }
    if (!details || typeof details !== 'object') {
      res.status(400).json({ message: 'details is required' }).end();
      return;
    }
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: 'payload is required' }).end();
      return;
    }

    const target = {
      source: new Types.ObjectId(sourceId),
      operation,
      details,
    }
    
    const result = await callIntegrationTarget(tenant, payload, target as any);
    res.json(result).end();
  } catch (error) {
    logger.error('Error calling integration target', error);
    res.status(500).json({ message: 'Error calling integration target' }).end();
  }
}
