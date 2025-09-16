const Configuration = require('../models/configuration')
const { allowedToChangeWebsiteUrls } = require("../../config");

const BASIC_APP_CONFIGURATION_KEY = 'app-configuration'

function getConfigurationByKey(req, res, next) {
  Configuration.getWithCache(req.headers.tenant, req.params.configKey, req.user && req.user.isAdmin)
    .then(configuration => {
      if (!configuration) {
        return Promise.reject(null)
      }
      req.configuration = configuration
      next();
    })
    .catch(() => res.status(404).json({ message: 'configuration not exists' }).end())
}

function getConfigurationsList(req, res) {
  const query = { tenant: req.headers.tenant };
  if (req.query?.key) {
    query.key = new RegExp(req.query.key, 'i');
  }
  if (req.query?.public) {
    query.public = req.query.public === 'true' || req.query.public === '1';
  }
  if (req.query?.kind) {
    query.kind = req.query.kind;
  }
  Configuration.find(query)
    .select('key tenant public kind description created')
    .lean()
    .exec()
    .then(list => {
      res.status(200).json(list || []).end()
    })
    .catch(() => res.status(401).json({ message: 'failed to load configurations list' }).end())
}

function getConfiguration(req, res) {
  if (typeof req.configuration === 'string') {
    res.status(200).set('Content-Type', 'application/json').end(req.configuration)
  } else {
    res.status(200).json(req.configuration).end()
  }
}

async function createConfiguration(req, res) {
  const body = req.body || {}

  const configuration = new Configuration({
    tenant: req.headers.tenant,
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
  const tenant = req.headers.tenant;
  const configKey = req.params.configKey;
  delete body.tenant;
  let configuration;
  try {
    configuration = await Configuration.getForEdit(tenant, configKey).exec();
  } catch {
    res.status(404).json({ message: 'configuration not exists' }).end()
    return;
  }

  if (body.description) {
    configuration.description = body.description
  }
  if (body.metadata) {
    if (configuration.key === BASIC_APP_CONFIGURATION_KEY && body.metadata.websiteUrls?.length) {
      if (allowedToChangeWebsiteUrls &&
        (
          !configuration.metadata.websiteUrls.every((url) => url === body.metadata.websiteUrls.includes(url)) ||
          !body.metadata.websiteUrls.every((url) => url === configuration.metadata.websiteUrls.includes(url))
        )
      ) {
        const existingTenantWithUrl = await Configuration.findOne({
          _id: { $ne: configuration._id },
          websiteUrls: { $in: body.metadata.websiteUrls }
        })
          .select('_id')
          .lean()
          .exec();

        if (existingTenantWithUrl) {
          res.status(400).json({ message: 'URL already exists for another account' }).end()
          return;
        }
      }
    } else {
      delete body.metadata.websiteUrls;
    }
    configuration.metadata = {
      ...(configuration.metadata || {}),
      ...body.metadata
    }
    configuration.markModified('metadata');
  }

  configuration.save()
    .then(() => {
      Configuration.clearCache(tenant, configKey);
      res.status(200).json(configuration).end()
    })
    .catch(() => {
      res.status(400).json({ message: 'configuration update failed' }).end()
    })
}

async function removeConfiguration(req, res) {
  if (req.params.configKey === BASIC_APP_CONFIGURATION_KEY) {
    res.status(403).json({ message: 'cannot remove app configuration' }).end()
    return;
  }

  let configuration;
  try {
    configuration = await Configuration.getForEdit(req.headers.tenant, req.params.configKey).select('key').exec();
    Configuration.clearCache(req.headers.tenant, req.params.configKey);
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

function getTenantByHost(req, res) {
  Configuration.findOne({ key: 'app-configuration', 'metadata.websiteUrls': req.query.host })
    .select('tenant metadata.websiteUrls')
    .lean()
    .exec()
    .then(appConfig => {
      return res.status(200).json(appConfig).end()
    })
    .catch(() => res.status(401).json({ message: 'failed to load tenant from host' }).end())
}

module.exports = {
  getConfigurationsList,
  getConfigurationByKey,
  getConfiguration,
  updateConfiguration,
  createConfiguration,
  removeConfiguration,
  getTenantByHost,
}
