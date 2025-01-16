import EventEmitter from 'events';
import * as jq from 'node-jq';

import { IEvent } from '../models/event';
import Plugin, { IPlugin } from '../models/plugin';
import { getPluginToken } from './tokens-management';
import { fetchPlugin } from './plugins-call';
import logger from './logger';
import Integration, { IIntegration } from '../models/integration';
import { IntegrationSourceKind } from '@qelos/global-types';
import { getUser } from './users';

const ALL = '*';

class HooksEmitter extends EventEmitter {
}

const hookEvents = new HooksEmitter();

export function emitPlatformEvent(event: IEvent) {
  hookEvents.emit('hook', event);
}

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
      hooks.forEach(({ hookUrl }) => {
        return fetchPlugin({
          url: hookUrl,
          method: 'POST',
          tenant: plugin.tenant,
          accessToken,
          body: emittedEventContent
        }).catch(logger.error);
      })
    }
  })).catch(() => null);
}

function executeIntegrationsOperations(platformEvent: IEvent, awaitedIntegrations: IIntegration[]) {
  const event = platformEvent.toObject();
  Promise.all(awaitedIntegrations.map(async integration => {
    // every step in data manipulation should be executed in order, asynchronously
    const calculatedData = integration.dataManipulation.reduce(async (acc, { map, populate }) => {
      const data = await acc;
      await Promise.all([
        ...Object.entries(map).map(async ([key, value]) => {
          // value is a JQ expression to be assigned to the key
          data[key] = await jq.run(value, data);
        }),
        ...Object.entries(populate).map(async ([key, { source, blueprint }]) => {
          if (source === 'user') {
            data[key] = await getUser(platformEvent.tenant, data[key])
          }
          if (source === 'workspace') {
            // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
          }
          if (source === 'blueprintEntity') {
            // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
          }
        })
      ]);

      return data
    }, event);

    // trigger integration target using calculated data:
    integration.target;
    calculatedData;

  })).catch(() => null);
}

hookEvents.on('hook', async (platformEvent: IEvent) => {
  logger.log('hook event', platformEvent);
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
    }).lean()
  ])

  if (awaitedPlugins.length) {
    executePluginsSubscribedWebhooks(platformEvent, awaitedPlugins);
  }

  if (awaitedIntegrations.length) {
    executeIntegrationsOperations(platformEvent, awaitedIntegrations);
  }
});
