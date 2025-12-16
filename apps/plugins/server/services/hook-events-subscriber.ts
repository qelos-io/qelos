import { IEvent } from '../models/event';
import Plugin, { IPlugin } from '../models/plugin';
import { clearPluginAccessToken, getPluginToken } from './tokens-management';
import { fetchPlugin } from './plugins-call';
import logger from './logger';
import Integration, { IIntegration } from '../models/integration';
import { IntegrationSourceKind } from '@qelos/global-types';
import { callIntegrationTarget } from './integration-target-call';
import { hookEvents } from './hook-events';
import { executeDataManipulation } from './data-manipulation-service';

const ALL = '*';

function executePluginsSubscribedWebhooks(platformEvent: IEvent, awaitedPlugins: IPlugin[]) {
  const emittedEventContent = JSON.stringify(platformEvent.toObject());

  Promise.all(awaitedPlugins.map(async plugin => {
    const hooks: { hookUrl: string }[] = [];

    plugin.subscribedEvents.forEach(subscribedEvent => {
      let shouldHook = false;
      if (!subscribedEvent.eventName) {
        subscribedEvent.eventName = ALL;
      }
      if (subscribedEvent.source && subscribedEvent.kind && subscribedEvent.eventName) { // plugin filled all values
        if ((subscribedEvent.source === platformEvent.source || subscribedEvent.source === ALL) &&
          (subscribedEvent.kind === platformEvent.kind || subscribedEvent.kind === ALL) &&
          (subscribedEvent.eventName === platformEvent.eventName || subscribedEvent.eventName === ALL)) {
          shouldHook = true;
        }
      } else if (!subscribedEvent.source && subscribedEvent.kind === platformEvent.kind) { // no source, only kind
        shouldHook = true;
      } else if (!subscribedEvent.kind && subscribedEvent.source === platformEvent.source) { // only by source, no matter the kind
        shouldHook = true;
      }

      if (shouldHook) {
        hooks.push({ hookUrl: subscribedEvent.hookUrl })
      }
    })

    if (hooks.length) {
      const accessToken = await getPluginToken(plugin)

      async function callHooks () {
        await Promise.all(hooks.map(({ hookUrl }) => {
          return fetchPlugin({
            url: hookUrl,
            method: 'POST',
            tenant: plugin.tenant,
            accessToken,
            body: emittedEventContent
          }).then(res => {
            if (res.status === 407) {
              throw new Error('Invalid token')
            }
            return res
          })
        }))
      }

      try {
        await callHooks()
      } catch (err: any) {
        if (err?.message === 'Invalid token') {
          await clearPluginAccessToken(plugin.tenant, plugin.apiPath);
          await callHooks();
        }
      }
    }
  })).catch(() => null);
}

function executeIntegrationsOperations(platformEvent: IEvent, awaitedIntegrations: IIntegration[]) {
  const event = JSON.parse(JSON.stringify(platformEvent.toObject()));
  Promise.all(awaitedIntegrations.map(async integration => {
    if (integration.trigger.details.source !== platformEvent.source && integration.trigger.details.source !== ALL) {
      return;
    }
    if (integration.trigger.details.kind !== platformEvent.kind && integration.trigger.details.kind !== ALL) {
      return;
    }
    if (integration.trigger.details.eventName !== platformEvent.eventName && integration.trigger.details.eventName !== ALL) {
      return;
    }
    logger.log('calculating integration data');
    // every step in data manipulation should be executed in order, asynchronously
    const calculatedData = await executeDataManipulation(platformEvent.tenant, event, integration.dataManipulation);

    logger.log('calculated integration data', typeof calculatedData);

    if (calculatedData.abort) {
      return;
    }

    // trigger integration target using calculated data:
    await callIntegrationTarget(platformEvent.tenant, calculatedData, integration.target);
  })).catch((err) => logger.error('failed to execute integration', err));
}

hookEvents.on('hook', async (platformEvent: IEvent) => {
  const [awaitedPlugins, awaitedIntegrations] = await Promise.all([
    Plugin.find({
      $and: [
        { tenant: platformEvent.tenant },
        {
          $or: [
            { 'subscribedEvents.source': platformEvent.source },
            { 'subscribedEvents.kind': platformEvent.kind },
            { 'subscribedEvents.eventName': platformEvent.eventName },
          ]
        }
      ]
    }).lean(),
    Integration.find({
      active: true,
      $and: [
        {
          tenant: platformEvent.tenant,
          'kind.0': IntegrationSourceKind.Qelos,
          'trigger.operation': 'webhook',
        },
        {
          $or: [
            { 'trigger.details.source': platformEvent.source },
            { 'trigger.details.kind': platformEvent.kind },
            { 'trigger.details.eventName': platformEvent.eventName },
          ]
        }
      ]
    }).populate('trigger.source').lean()
  ])

  if (awaitedPlugins.length) {
    executePluginsSubscribedWebhooks(platformEvent, awaitedPlugins);
  }

  if (awaitedIntegrations.length) {
    executeIntegrationsOperations(platformEvent, awaitedIntegrations);
  }
});
