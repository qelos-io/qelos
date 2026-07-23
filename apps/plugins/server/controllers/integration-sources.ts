
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
import {
  checkIntegrationSourceStatus,
  resolveStatusAuthentication,
} from '../services/integration-source-status';
import { isValidObjectId, Types } from 'mongoose';
import {
  buildPaymentAdminSuggestions,
  buildPaymentEventDescription,
  extractSumitProviderError,
  IntegrationSourceKind,
  sanitizeProviderErrorBody,
} from '@qelos/global-types';

const PUBLIC_FIELDS = '-authentication';

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

export async function checkIntegrationSourceStatusHandler(req, res) {
  const tenant = req.headers.tenant as string;
  const sourceId = req.params.sourceId as string | undefined;
  const { kind: bodyKind, metadata: bodyMetadata, authentication: bodyAuthentication } = req.body || {};
  let resolvedKind: IntegrationSourceKind | undefined;

  try {
    let kind: IntegrationSourceKind;
    let metadata: Record<string, unknown>;
    let authentication: Record<string, unknown> | undefined;

    if (sourceId) {
      if (!isValidObjectId(sourceId)) {
        res.status(400).json({ message: 'invalid source id', code: 'INVALID_SOURCE_ID' }).end();
        return;
      }

      const source = await IntegrationSource
        .findOne({ _id: sourceId, tenant })
        .lean()
        .exec();

      if (!source) {
        res.status(404).json({ message: 'integration source not found', code: 'INTEGRATION_SOURCE_NOT_FOUND' }).end();
        return;
      }

      kind = source.kind;
      resolvedKind = kind;
      metadata = bodyMetadata && typeof bodyMetadata === 'object' && !Array.isArray(bodyMetadata)
        ? { ...source.metadata, ...bodyMetadata }
        : source.metadata;

      const storedAuth = source.authentication
        ? await getEncryptedSourceAuthentication(tenant, source.kind, source.authentication)
        : null;

      authentication = resolveStatusAuthentication(
        storedAuth,
        bodyAuthentication && typeof bodyAuthentication === 'object' && !Array.isArray(bodyAuthentication)
          ? bodyAuthentication
          : undefined,
        source.kind,
      );
    } else {
      if (!bodyKind || typeof bodyKind !== 'string' || !Object.values(IntegrationSourceKind).includes(bodyKind as IntegrationSourceKind)) {
        res.status(400).json({ message: 'kind is required', code: 'MISSING_KIND' }).end();
        return;
      }

      if (!bodyMetadata || typeof bodyMetadata !== 'object' || Array.isArray(bodyMetadata)) {
        res.status(400).json({ message: 'metadata is required', code: 'MISSING_METADATA' }).end();
        return;
      }

      kind = bodyKind as IntegrationSourceKind;
      resolvedKind = kind;
      metadata = bodyMetadata;
      authentication = bodyAuthentication && typeof bodyAuthentication === 'object' && !Array.isArray(bodyAuthentication)
        ? bodyAuthentication
        : undefined;
    }

    const result = await checkIntegrationSourceStatus({
      tenant,
      kind,
      metadata,
      authentication,
    });

    res.status(200).json(result).end();
  } catch (error: any) {
    if (error?.status === 400) {
      const code = error.code || 'STATUS_CHECK_VALIDATION_FAILED';
      res.status(400).json({
        message: error.message,
        code,
        adminSuggestions: buildPaymentAdminSuggestions({
          code,
          message: error.message,
          providerKind: resolvedKind ?? bodyKind,
        }),
      }).end();
      return;
    }

    logger.error('Error checking integration source status', error);
    res.status(500).json({ message: 'could not check integration source status' }).end();
  }
}

export async function triggerIntegrationSource(req, res) {
  const sourceId: string = req.params.sourceId;
  const tenant = req.headers.tenant as string;
  let sourceKind: string | undefined;

  try {
    const { payload, operation, details } = req.body as { payload: any, operation: string, details: any };

    if (!isValidObjectId(sourceId)) {
      res.status(400).json({ message: 'invalid source id', code: 'INVALID_SOURCE_ID' }).end();
      return;
    }
    if (!operation || typeof operation !== 'string') {
      res.status(400).json({ message: 'operation is required', code: 'MISSING_OPERATION' }).end();
      return;
    }
    if (!details || typeof details !== 'object') {
      res.status(400).json({ message: 'details is required', code: 'MISSING_DETAILS' }).end();
      return;
    }
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: 'payload is required', code: 'MISSING_PAYLOAD' }).end();
      return;
    }

    const source = await IntegrationSource
      .findOne({ _id: sourceId, tenant })
      .select('kind')
      .lean()
      .exec();

    if (!source) {
      res.status(404).json({
        message: 'Integration source not found',
        code: 'INTEGRATION_SOURCE_NOT_FOUND',
        adminSuggestions: buildPaymentAdminSuggestions({
          code: 'INTEGRATION_SOURCE_NOT_FOUND',
        }),
      }).end();
      return;
    }

    sourceKind = source.kind;

    const target = {
      source: new Types.ObjectId(sourceId),
      operation,
      details,
    };

    const result = await callIntegrationTarget(tenant, payload, target as any);
    if (result === undefined) {
      res.status(404).json({
        message: 'Integration source not found',
        code: 'INTEGRATION_SOURCE_NOT_FOUND',
        adminSuggestions: buildPaymentAdminSuggestions({
          code: 'INTEGRATION_SOURCE_NOT_FOUND',
        }),
      }).end();
      return;
    }

    res.json(result).end();
  } catch (error: any) {
    logger.error('Error calling integration target', error);

    const providerKind = error?.providerKind || sourceKind;
    const providerError = providerKind === 'sumit'
      ? extractSumitProviderError(error?.responseBody)
      : sanitizeProviderErrorBody(error?.responseBody);
    const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    const code = error?.code || 'INTEGRATION_TARGET_FAILED';
    const adminSuggestions = buildPaymentAdminSuggestions({
      providerKind,
      operation: req.body?.operation,
      code,
      status,
      message: error?.message,
      providerError,
    });

    res.status(status).json({
      message: error?.message || 'Error calling integration target',
      code,
      providerKind,
      operation: req.body?.operation,
      providerError,
      adminSuggestions,
      description: buildPaymentEventDescription(
        `Provider call failed: ${req.body?.operation || 'integration target'}`,
        providerError,
      ),
    }).end();
  }
}
