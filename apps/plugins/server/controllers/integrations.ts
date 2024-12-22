import Integration from '../models/integration';
import Plugin from '../models/plugin';
import { validateIntegrationTarget } from '../services/integrations-target-service';
import { validateIntegrationTrigger } from '../services/integrations-trigger-service';

export async function getAllIntegrations(req, res) {
  const query: any = { tenant: req.headers.tenant };
  if (req.query.plugin) {
    query.plugin = req.query.plugin;
  }
  if (req.query.user) {
    query.user = req.query.user;
  }
  if (req.query.kind) {
    query.kind = req.query.kind;
  }
  if (req.query.source) {
    query.$or = [{ 'trigger.source': req.query.source }, { 'target.source': req.query.source }];
  }
  try {
    const list = await Integration.find(query).exec();
    res.json(list).end();
  } catch {
    res.status(500).json({ message: 'could not get integrations' }).end();
  }
}

export async function getIntegration(req, res) {
  try {
    const integration = await Integration.findOne({ _id: req.params.integrationId, tenant: req.headers.tenant }).exec();
    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }
    res.json(integration).end();
  } catch {
    res.status(500).json({ message: 'could not get integration' }).end();
  }
}

export async function createIntegration(req, res) {
  const { trigger, target } = req.body || {}

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
    trigger,
    target
  });


  try {
    const [triggerSource, targetSource] = await Promise.all([
      validateIntegrationTrigger(req.headers.tenant, integration.trigger),
      validateIntegrationTarget(req.headers.tenant, integration.target)
    ]);

    // should register the trigger integration source

    await integration.save();
    res.json(integration).end();
  } catch {
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
    if (req.body?.trigger) {
      integration.trigger = req.body.trigger;
      const triggerSource = await validateIntegrationTrigger(req.headers.tenant, integration.trigger);
    }
    if (req.body?.target) {
      integration.target = req.body.target;
      const targetSource = await validateIntegrationTarget(req.headers.tenant, integration.target);
    }
    if (integration.isModified()) {
      await integration.save();
    }
    res.json(integration).end();
  } catch {
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
    res.json(integration).end();
  } catch {
    res.status(500).json({ message: 'could not delete integration' }).end();
  }
}