const Configuration = require('../models/configuration')

const BASIC_APP_CONFIGURATION_KEY = 'app-configuration'

function getConfigurationsList(req, res) {
  const query = {};
  if (req.query?.tenant) {
    query.tenant = req.query.tenant;
  }
  if (req.query?.key) {
    query.key = req.query.key;
  }
  if (req.query?.public) {
    query.public = req.query.public === 'true' || req.query.public === '1';
  }
  if (req.query?.kind) {
    query.kind = req.query.kind;
  }
  Configuration.find(query)
    .select('-metadata')
    .lean()
    .exec()
    .then(list => {
      res.status(200).json(list || []).end()
    })
    .catch(() => res.status(401).json({ message: 'failed to load configurations list' }).end())
}

function getConfiguration(req, res) {
  Configuration.findOne({ key: req.params.configKey, tenant: req.params.tenant })
    .lean()
    .exec()
    .then(configuration => {
      res.status(200).json(configuration).end()
    })
    .catch(() => res.status(401).json({ message: 'failed to load configuration' }).end())
}

async function createConfiguration(req, res) {
  const body = req.body || {}

  const configuration = new Configuration({
    tenant: body.tenant,
    key: body.key,
    public: !!body.public,
    kind: body.kind,
    metadata: body.metadata || {},
  })

  configuration.save()
    .then(() => {
      res.status(200).json(configuration).end()
    })
    .catch(() => {
      res.status(400).json({ message: 'configuration creation failed' }).end()
    })
}


async function updateConfiguration(req, res) {
  const body = req.body || {}
  const configKey = req.params.configKey;
  const tenant = req.params.tenant;

  try {
    const configuration = await Configuration.findOne({ key: configKey, tenant });
    if (!configuration) {
      res.status(404).json({ message: 'configuration not exists' }).end()
      return;
    }

    if (body.description) {
      configuration.description = body.description
    }


    if (body.metadata) {
      configuration.metadata = {
        ...(configuration.metadata || {}),
        ...body.metadata
      }
      configuration.markModified('metadata');
    }

    await configuration.save()
    Configuration.clearCache(tenant, configKey);
    res.status(200).json(configuration).end()
  } catch {
    res.status(400).json({ message: 'configuration update failed' }).end()
  }
}

async function removeConfiguration(req, res) {
  if (req.params.configKey === BASIC_APP_CONFIGURATION_KEY) {
    res.status(403).json({ message: 'cannot remove root app configuration' }).end()
    return;
  }
  const tenant = req.params.tenant;
  let configuration;
  try {
    configuration = await Configuration.findOne({ key: req.params.configKey, tenant });
    Configuration.clearCache(tenant, req.params.configKey);
  } catch {
    res.status(404).json({ message: 'configuration not exists' }).end()
    return;
  }

  try {
    await Configuration.deleteOne({_id: configuration._id, tenant: req.headers.tenant })
    res.status(200).json(configuration).end()
  } catch {
    res.status(500).json({ message: 'remove configuration failed' }).end()
  }
}

module.exports = {
  getConfigurationsList,
  getConfiguration,
  updateConfiguration,
  createConfiguration,
  removeConfiguration,
}
