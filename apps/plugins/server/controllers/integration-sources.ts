import IntegrationSource from '../models/integration-source';
import Plugin from '../models/plugin';
import { storeEncryptedSourceAuthentication } from '../services/source-authentication-service';
import { validateSourceMetadata } from '../services/source-metadata-service';

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

export async function createIntegrationSource(req, res) {
  const { authentication, name, labels, kind, metadata } = req.body;

  const userId = req.user._id;
  const plugin = await Plugin.findOne({ tenant: req.headers.tenant, user: userId }).select('_id').lean().exec();

  const authId = await storeEncryptedSourceAuthentication(req.headers.tenant, kind, authentication);

  const source = new IntegrationSource({
    tenant: req.headers.tenant,
    name,
    labels,
    kind,
    metadata: validateSourceMetadata(metadata),
    user: userId,
    plugin: plugin?._id,
    authentication: authId,
  });

  try {
    await source.save();
    const { authentication, ...permittedData } = source;
    res.json(permittedData).end();
  } catch {
    if (authId) {
      storeEncryptedSourceAuthentication(req.headers.tenant, kind, null).catch();
    }
    res.status(500).json({ message: 'could not create integration source' }).end();
  }
}

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
      source.metadata = validateSourceMetadata(source.kind, metadata);
    }

    if (authentication) {
      const kind = source.kind;
      const newAuthId = await storeEncryptedSourceAuthentication(req.headers.tenant, kind, authentication);

      if (newAuthId) {
        storeEncryptedSourceAuthentication(req.headers.tenant, kind, null, source.authentication).catch();
        source.authentication = newAuthId;
      }
    }

    if (source.isModified()) {
      await source.save();
    }
    res.json(source).end();
  } catch {
    res.status(500).json({ message: 'could not update integration source' }).end();
  }
}

export async function removeIntegrationSource(req, res) {
  try {
    const query = { _id: req.params.sourceId, tenant: req.headers.tenant };
    const source = await IntegrationSource
      .findOne(query)
      .select(PUBLIC_FIELDS)
      .exec()

    if (!source) {
      res.status(404).json({ message: 'integration source not found' }).end();
      return;
    }

    await IntegrationSource.deleteOne(query).exec();
    res.end(source);
  } catch {
    res.status(500).json({ message: 'could not delete integration source' }).end();
  }
}