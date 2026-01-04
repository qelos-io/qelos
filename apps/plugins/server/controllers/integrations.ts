import { ResponseError } from '@qelos/api-kit';
import Integration from '../models/integration';
import Plugin from '../models/plugin';
import { validateIntegrationTarget } from '../services/integrations-target-service';
import { validateIntegrationTrigger } from '../services/integrations-trigger-service';
import logger from '../services/logger';
import { cacheManager } from '../services/cache-manager';

const INTEGRATION_POPULATE_FIELDS = ['trigger.source', 'target.source'];

function geIntegrationCacheKey(tenant: string, integrationId: string, $populate: boolean) {
  return `integration:${$populate ? 'populated': 'plain'}:${tenant}:${integrationId}`
}

export async function getAllIntegrations(req, res) {
  const query: any = { tenant: req.headers.tenant };
  if (req.query.plugin) {
    query.plugin = req.query.plugin;
  }
  if (req.query.user) {
    query.user = req.query.user;
  }
  if (req.query['trigger.source']) {
    query['trigger.source'] = req.query['trigger.source'];
  }
  if (req.query['target.source']) {
    query['target.source'] = req.query['target.source'];
  }
  if (req.query['trigger.kind']) {
    query['trigger.kind'] = req.query['trigger.kind'];
  }
  if (req.query['target.kind']) {
    query['target.kind'] = req.query['target.kind'];
  }
  if (req.query.kind) {
    query.kind = req.query.kind;
  }
  if (req.query.source) {
    query.$or = [{ 'trigger.source': req.query.source }, { 'target.source': req.query.source }];
  }
  if (typeof req.query.active === 'string') {
    query.active = req.query.active === 'true' || req.query.active === '1';
  }
  if (req.query.id || req.query._id) {
    const strId = req.query.id || req.query._id;
    const ids = strId instanceof Array ? strId : strId.split(',');
    if (ids.length === 1) {
      query._id = ids[0];
    } else {
      query._id = { $in: ids }
    }
  }
  try {
    const list = await Integration.find(query).lean().exec();
    res.json(list).end();
  } catch {
    res.status(500).json({ message: 'could not get integrations' }).end();
  }
}

export async function getIntegration(req, res) {
  const $populate = req.query.$populate === 'true' || req.query.$populate === '1'
  try {
    const integration = await cacheManager.wrap(geIntegrationCacheKey(req.headers.tenant, req.params.integrationId, $populate), async () => {
      const integration = await Integration
      .findOne({ _id: req.params.integrationId, tenant: req.headers.tenant }, null, {populate: $populate ? INTEGRATION_POPULATE_FIELDS : undefined})
      .lean()
      .exec();
      return integration ? JSON.stringify(integration) : '';
    }, { ttl: 60 * 60 * 24 });
    if (integration) {
      res.status(200)
        .set('Content-Type', 'application/json')
        .end(integration);
    } else {
      res.status(404).json({message: 'Integration not found'}).end()
    }
  } catch {
    res.status(500).json({ message: 'Could not get integration' }).end();
  }
}

export async function createIntegration(req, res) {
  const { trigger, target, dataManipulation, active } = req.body || {}

  if (!trigger || !target) {
    res.status(400).json({ message: 'trigger and target are required' }).end();
    return;
  }

  const userId = req.user._id;
  const plugin = await Plugin.findOne({ tenant: req.headers.tenant, user: userId }).select('_id').lean().exec();

  const integration = new Integration({
    tenant: req.headers.tenant,
    user: userId,
    plugin: plugin?._id,
    dataManipulation,
    trigger,
    target,
    active
  });


  try {
    const [triggerSource, targetSource] = await Promise.all([
      validateIntegrationTrigger(req.headers.tenant, integration.trigger),
      validateIntegrationTarget(req.headers.tenant, integration.target)
    ]);

    integration.kind = [triggerSource.kind, targetSource.kind];

    // should register the trigger integration source

    await integration.save();
    res.json(integration).end();
  } catch (err) {
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
      return;
    }
    logger.log('error creating integration', err);
    res.status(500).json({ message: 'could not create integration' }).end();
  }
}

export async function updateIntegration(req, res) {
  try {
    const integration = await Integration.findOne({ _id: req.params.integrationId, tenant: req.headers.tenant }).exec();
    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }
    if (req.body?.active !== undefined) {
      integration.active = req.body.active;
    }
    if (req.body?.trigger) {
      integration.trigger = req.body.trigger;
      const triggerSource = await validateIntegrationTrigger(req.headers.tenant, integration.trigger);
      integration.kind = [triggerSource.kind, integration.kind[1]];
    }
    if (req.body?.target) {
      integration.target = req.body.target;
      const targetSource = await validateIntegrationTarget(req.headers.tenant, integration.target);
      integration.kind = [integration.kind[0], targetSource.kind];
    }
    if (req.body?.dataManipulation) {
      integration.dataManipulation = req.body.dataManipulation;
    }
    if (integration.isModified()) {
      await integration.save();
      cacheManager.setItem(geIntegrationCacheKey(integration.tenant, req.params.integrationId, true), JSON.stringify(integration), { ttl: 1 }).catch();
      cacheManager.setItem(geIntegrationCacheKey(integration.tenant, req.params.integrationId, false), JSON.stringify(integration), { ttl: 1 }).catch();
      cacheManager.setItem(`integration-tools:${integration.tenant}:${integration.kind[0]}:${req.params.integrationId}`, '', { ttl: 1 }).catch();
    }
    res.json(integration).end();
  } catch (err) {
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
      return;
    }
    logger.error('could not update integration', err);
    res.status(500).json({ message: 'could not update integration' }).end();
  }
}

export async function removeIntegration(req, res) {
  try {
    const query = { _id: req.params.integrationId, tenant: req.headers.tenant };
    const integration = await Integration.findOne(query).exec();
    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }
    await Integration.deleteOne(query).exec();
    cacheManager.setItem(geIntegrationCacheKey(integration.tenant, req.params.integrationId, true), '', { ttl: 1 }).catch();
    cacheManager.setItem(geIntegrationCacheKey(integration.tenant, req.params.integrationId, false), '', { ttl: 1 }).catch();
    cacheManager.setItem(`integration-tools:${integration.tenant}:${integration.kind[0]}:${req.params.integrationId}`, '', { ttl: 1 }).catch();
    res.json(integration).end();
  } catch {
    res.status(500).json({ message: 'could not delete integration' }).end();
  }
}
