import { IDataManipulationStep, IIntegration, IIntegrationEntity } from "@qelos/global-types";
import { IIntegrationSource, IntegrationSourceKind } from "@qelos/global-types";
import logger from "../logger";
import { calPublicPluginsService } from "../plugins-service-api";

// Helper functions for integration operations
async function getIntegrationSources(tenant: string, user: any, kind?: IntegrationSourceKind) {
  try {
    const query = kind ? `?kind=${kind}` : '';
    return await calPublicPluginsService(`/api/integration-sources${query}`, { tenant, user }, { method: 'GET' });
  } catch (error: any) {
    logger.error('Error getting integration sources:', error);
    throw new Error(`Failed to get integration sources: ${error?.message || 'Unknown error'}`);
  }
}

async function getIntegrationSource(tenant: string, user: any, sourceId: string) {
  try {
    return await calPublicPluginsService(`/api/integration-sources/${sourceId}`, { tenant, user }, { method: 'GET' });
  } catch (error: any) {
    logger.error('Error getting integration source:', error);
    throw new Error(`Failed to get integration source: ${error?.message || 'Unknown error'}`);
  }
}

async function createIntegrationSource(tenant: string, user: string, source: Partial<IIntegrationSource>) {
  try {
    return await calPublicPluginsService('/api/integration-sources', { tenant, user }, {
      method: 'POST',
      data: source
    });
  } catch (error: any) {
    logger.error('Error creating integration source:', error);
    throw new Error(`Failed to create integration source: ${error?.message || 'Unknown error'}`);
  }
}

async function updateIntegrationSource(tenant: string, user: any, sourceId: string, updates: Partial<IIntegrationSource>) {
  try {
    return await calPublicPluginsService(`/api/integration-sources/${sourceId}`, { tenant, user }, {
      method: 'PUT',
      data: updates
    });
  } catch (error: any) {
    logger.error('Error updating integration source:', error);
    throw new Error(`Failed to update integration source: ${error?.message || 'Unknown error'}`);
  }
}

async function removeIntegrationSource(tenant: string, user: any, sourceId: string) {
  try {
    return await calPublicPluginsService(`/api/integration-sources/${sourceId}`, { tenant, user }, { method: 'DELETE' });
  } catch (error: any) {
    logger.error('Error removing integration source:', error);
    throw new Error(`Failed to remove integration source: ${error?.message || 'Unknown error'}`);
  }
}

async function getIntegrations(tenant: string, user: any, query: Record<string, any> = { kind: undefined, active: undefined }) {
  try {
    const url = `/api/integrations?${Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')}`;
    const integrations = await calPublicPluginsService(url, { tenant, user }, { method: 'GET' });
    return integrations;
  } catch (error: any) {
    logger.error('Error getting integrations:', error);
    throw new Error(`Failed to get integrations: ${error?.message || 'Unknown error'}`);
  }
}

async function createIntegration(tenant: string, user: string, integration: Partial<IIntegration>) {
  try {
    return await calPublicPluginsService('/api/integrations', { tenant, user }, {
      method: 'POST',
      data: integration
    });
  } catch (error: any) {
    logger.error('Error creating integration:', error);
    throw new Error(`Failed to create integration: ${error?.message || 'Unknown error'}`);
  }
}

async function updateIntegration(tenant: string, user: any, integrationId: string, updates: Partial<IIntegration>) {
  try {
    return await calPublicPluginsService(`/api/integrations/${integrationId}`, { tenant, user }, {
      method: 'PUT',
      data: updates
    });
  } catch (error: any) {
    logger.error('Error updating integration:', error);
    throw new Error(`Failed to update integration: ${error?.message || 'Unknown error'}`);
  }
}

async function removeIntegration(tenant: string, user: any, integrationId: string) {
  try {
    return await calPublicPluginsService(`/api/integrations/${integrationId}`, { tenant, user }, { method: 'DELETE' });
  } catch (error: any) {
    logger.error('Error removing integration:', error);
    throw new Error(`Failed to remove integration: ${error?.message || 'Unknown error'}`);
  }
}

async function getWebhookSample(tenant: string, user: any, source: string, kind: string, eventName: string) {
  try {
    const [sample] = await calPublicPluginsService(`/api/events?source=${source}&kind=${kind}&eventName=${eventName}`, { tenant, user }, {
      method: 'GET',
    });
    if (sample) {
      return await calPublicPluginsService(`/api/events/${sample._id}`, { tenant, user }, {
        method: 'GET',
      });
    }
    return null;
  } catch (error: any) {
    logger.error('Error getting webhook sample:', error);
    throw new Error(`Failed to get webhook sample: ${error?.message || 'Unknown error'}`);
  }
}

// Function calling definitions with handlers
export const createConnectionCalling = {
  type: 'function',
  name: 'create_connection',
  description: 'Create a new integration source (connection) for external services',
  function: {
    name: 'create_connection',
    description: 'Create a new integration source (connection) for external services',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the connection'
        },
        kind: {
          type: 'string',
          enum: ['qelos', 'openai', 'email', 'n8n', 'supabase', 'linkedin', 'http', 'claudeai', 'facebook'],
          description: 'Type of the connection'
        },
        labels: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional labels for categorizing the connection'
        },
        authentication: {
          type: 'object',
          description: 'Authentication details (tokens, passwords, etc.)'
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata specific to the connection kind'
        }
      },
      required: ['name', 'kind']
    },
  },
  handler: async (req, payload = { name: '', kind: '' as IntegrationSourceKind, labels: [], authentication: {}, metadata: {} }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.name || !payload.kind) {
      return { error: "Name and kind are required" };
    }

    // for each kind there's a different authentication method and metadata
    // if the authentication and metadata are empty - suggest the chat to the user to provide them, and send a suggestion of the relevant authentication method and metadata

    if (payload.kind !== 'qelos' && (!payload.authentication || !payload.metadata)) {
      let msg = `ERROR: Please provide authentication and metadata for the connection`;
      if (payload.kind === 'openai') {
        msg += `\n\nFor OpenAI, you can use the following authentication method: ${JSON.stringify({ authentication: { apiKey: '' } })}`;
      } else if (payload.kind === 'claudeai') {
        msg += `\n\nFor ClaudeAI, you can use the following authentication method: ${JSON.stringify({ authentication: { apiKey: '' } })}`;
      } else if (payload.kind === 'http') {
        msg += `\n\nFor HTTP, you can use the following authentication method: ${JSON.stringify({ authentication: { securedHeaders: { 'Authorization': 'Bearer ' } }, metadata: { baseUrl: '', method: 'GET', headers: {}, query: {} } })}`;
      } else if (payload.kind === 'email') {
        msg += `\n\nFor Email, you can use the following authentication method: ${JSON.stringify({ authentication: { password: '' }, metadata: { email: '', pop3: '', senderName: '', smtp: '', username: '' } })}`;
      } else if (payload.kind === 'linkedin') {
        msg += `\n\nFor LinkedIn, you can use the following authentication method: ${JSON.stringify({ authentication: { clientSecret: '' }, metadata: { clientId: '', scope: '' } })}`;
      } else if (payload.kind === 'facebook') {
        msg += `\n\nFor Facebook, you can use the following authentication method: ${JSON.stringify({ authentication: { clientSecret: '' }, metadata: { clientId: '', scope: '' } })}`;
      } else if (payload.kind === 'n8n') {
        msg += `\n\nFor N8n, you can use the following authentication method: ${JSON.stringify({ authentication: { apikey: '' }, metadata: { url: '' } })}`;
      }
      return msg;
    }


    try {
      // Create the connection
      const source: Partial<IIntegrationSource> = {
        name: payload.name,
        kind: payload.kind as IntegrationSourceKind,
        labels: payload.labels || [],
        authentication: payload.authentication || {},
        metadata: payload.metadata || {}
      };

      const result = await createIntegrationSource(tenant, user, source);
      return result;
    } catch (error: any) {
      logger.error('Error in createConnectionCalling:', error);
      return { error: error.message || 'Failed to create connection' };
    }
  }
};

export const getConnectionCalling = {
  type: 'function',
  name: 'get_connection',
  description: 'Get details of a specific integration source (connection)',
  function: {
    name: 'get_connection',
    description: 'Get details of a specific integration source (connection)',
    parameters: {
      type: 'object',
      properties: {
        connectionId: {
          type: 'string',
          description: 'ID of the connection to retrieve'
        }
      },
      required: ['connectionId']
    },
  },
  handler: async (req, payload = { connectionId: '' }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.connectionId) {
      return { error: "Connection ID is required" };
    }

    try {
      const result = await getIntegrationSource(tenant, user, payload.connectionId);
      return result;
    } catch (error: any) {
      logger.error('Error in getConnectionCalling:', error);
      return { error: error.message || 'Failed to get connection' };
    }
  }
};

export const updateConnectionCalling = {
  type: 'function',
  name: 'update_connection',
  description: 'Update an existing integration source (connection)',
  function: {
    name: 'update_connection',
    description: 'Update an existing integration source (connection)',
    parameters: {
      type: 'object',
      properties: {
        connectionId: {
          type: 'string',
          description: 'ID of the connection to update'
        },
        name: {
          type: 'string',
          description: 'Updated name of the connection'
        },
        labels: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Updated labels for categorizing the connection'
        },
        authentication: {
          type: 'object',
          description: 'Updated authentication details'
        },
        metadata: {
          type: 'object',
          description: 'Updated additional metadata'
        }
      },
      required: ['connectionId']
    },
  },
  handler: async (req, payload = { connectionId: '', name: undefined, labels: undefined, authentication: undefined, metadata: undefined }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.connectionId) {
      return { error: "Connection ID is required" };
    }

    try {
      // Create update object with only provided fields
      const updates: Partial<IIntegrationSource> = {};

      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.labels !== undefined) updates.labels = payload.labels;
      if (payload.authentication !== undefined) updates.authentication = payload.authentication;
      if (payload.metadata !== undefined) updates.metadata = payload.metadata;

      const result = await updateIntegrationSource(tenant, user, payload.connectionId, updates);
      return result;
    } catch (error: any) {
      logger.error('Error in updateConnectionCalling:', error);
      return { error: error.message || 'Failed to update connection' };
    }
  }
};

export const removeConnectionCalling = {
  type: 'function',
  name: 'remove_connection',
  description: 'Remove an integration source (connection)',
  function: {
    name: 'remove_connection',
    description: 'Remove an integration source (connection)',
    parameters: {
      type: 'object',
      properties: {
        connectionId: {
          type: 'string',
          description: 'ID of the connection to remove'
        }
      },
      required: ['connectionId']
    },
  },
  handler: async (req, payload = { connectionId: '' }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.connectionId) {
      return { error: "Connection ID is required" };
    }

    try {
      const result = await removeIntegrationSource(tenant, user, payload.connectionId);
      return { success: true, message: 'Connection removed successfully', result };
    } catch (error: any) {
      logger.error('Error in removeConnectionCalling:', error);
      return { error: error.message || 'Failed to remove connection' };
    }
  }
};

export const listConnectionsCalling = {
  type: 'function',
  name: 'list_connections',
  description: 'Get a list of existing connections filtered by kind',
  function: {
    name: 'list_connections',
    description: 'Get a list of existing connections filtered by kind',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['qelos', 'openai', 'email', 'n8n', 'supabase', 'linkedin', 'http', 'claudeai', 'facebook'],
          description: 'Filter connections by this kind'
        }
      }
    },
  },
  handler: async (req, payload = { kind: undefined }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    try {
      const kind = payload.kind as IntegrationSourceKind | undefined;
      const sources = await getIntegrationSources(tenant, user, kind);
      return sources;
    } catch (error: any) {
      logger.error('Error in listConnectionsCalling:', error);
      return { error: error.message || 'Failed to list connections' };
    }
  }
};

export const createIntegrationCalling = {
  type: 'function',
  name: 'create_integration',
  description: 'Create a new integration between a trigger and a target',
  function: {
    name: 'create_integration',
    description: 'Create a new integration between a trigger and a target',
    parameters: {
      type: 'object',
      properties: {
        trigger: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'ID of the source connection for the trigger'
            },
            operation: {
              type: 'string',
              description: 'Operation type for the trigger (e.g., webhook, chatCompletion)'
            },
            details: {
              type: 'object',
              description: 'Specific details for the trigger operation'
            }
          },
          required: ['source', 'operation']
        },
        target: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'ID of the source connection for the target'
            },
            operation: {
              type: 'string',
              description: 'Operation type for the target (e.g., webhook, createBlueprintEntity)'
            },
            details: {
              type: 'object',
              description: 'Specific details for the target operation'
            }
          },
          required: ['source', 'operation']
        },
        dataManipulation: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              map: {
                type: 'object',
                description: 'JQ expressions to map data from trigger to target'
              },
              populate: {
                type: 'object',
                description: 'Data to populate from Qelos sources'
              },
              clean: {
                type: 'boolean',
                description: 'Whether to clean the data'
              },
              abort: {
                type: ['boolean', 'string'],
                description: 'Condition to abort the integration'
              }
            }
          },
          description: 'Steps to manipulate data between trigger and target'
        },
        active: {
          type: 'boolean',
          description: 'Whether the integration should be active immediately',
          default: true
        }
      },
      required: ['trigger', 'target']
    },
  },
  handler: async (req, payload: any = { trigger: {}, target: {}, dataManipulation: [], active: true }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.trigger || !payload.trigger.source || !payload.trigger.operation) {
      return { error: "Trigger source and operation are required" };
    }

    if (!payload.target || !payload.target.source || !payload.target.operation) {
      return { error: "Target source and operation are required" };
    }

    try {
      // Create the integration
      const integration: Partial<IIntegration> = {
        trigger: payload.trigger as IIntegrationEntity,
        target: payload.target as IIntegrationEntity,
        dataManipulation: payload.dataManipulation as IDataManipulationStep[] || [],
        active: payload.active !== false, // Default to true if not specified
        kind: ['integration'] // Default kind
      };

      const result = await createIntegration(tenant, user, integration);
      return result;
    } catch (error: any) {
      logger.error('Error in createIntegrationCalling:', error);
      return { error: error.message || 'Failed to create integration' };
    }
  }
};

export const updateIntegrationCalling = {
  type: 'function',
  name: 'update_integration',
  description: 'Update an existing integration',
  function: {
    name: 'update_integration',
    description: 'Update an existing integration',
    parameters: {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'ID of the integration to update'
        },
        trigger: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'ID of the source connection for the trigger'
            },
            operation: {
              type: 'string',
              description: 'Operation type for the trigger'
            },
            details: {
              type: 'object',
              description: 'Specific details for the trigger operation'
            }
          }
        },
        target: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'ID of the source connection for the target'
            },
            operation: {
              type: 'string',
              description: 'Operation type for the target'
            },
            details: {
              type: 'object',
              description: 'Specific details for the target operation'
            }
          }
        },
        dataManipulation: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              map: {
                type: 'object',
                description: 'JQ expressions to map data from trigger to target'
              },
              populate: {
                type: 'object',
                description: 'Data to populate from Qelos sources'
              },
              clean: {
                type: 'boolean',
                description: 'Whether to clean the data'
              },
              abort: {
                type: ['boolean', 'string'],
                description: 'Condition to abort the integration'
              }
            }
          },
          description: 'Steps to manipulate data between trigger and target'
        },
        active: {
          type: 'boolean',
          description: 'Whether the integration should be active'
        }
      },
      required: ['integrationId']
    },
  },
  handler: async (req, payload: any = { integrationId: '' }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.integrationId) {
      return { error: "Integration ID is required" };
    }

    try {
      // Create update object with only provided fields
      const updates: Partial<IIntegration> = {};

      if (payload.trigger !== undefined) updates.trigger = payload.trigger;
      if (payload.target !== undefined) updates.target = payload.target;
      if (payload.dataManipulation !== undefined) updates.dataManipulation = payload.dataManipulation;
      if (payload.active !== undefined) updates.active = payload.active;

      const result = await updateIntegration(tenant, user, payload.integrationId, updates);
      return result;
    } catch (error: any) {
      logger.error('Error in updateIntegrationCalling:', error);
      return { error: error.message || 'Failed to update integration' };
    }
  }
};

export const toggleIntegrationStatusCalling = {
  type: 'function',
  name: 'toggle_integration_status',
  description: 'Activate or deactivate an integration',
  function: {
    name: 'toggle_integration_status',
    description: 'Activate or deactivate an integration',
    parameters: {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'ID of the integration to update'
        },
        active: {
          type: 'boolean',
          description: 'Set to true to activate, false to deactivate'
        }
      },
      required: ['integrationId', 'active']
    },
  },
  handler: async (req, payload = { integrationId: '', active: true }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.integrationId) {
      return { error: "Integration ID is required" };
    }

    if (payload.active === undefined) {
      return { error: "Active status is required" };
    }

    try {
      const result = await updateIntegration(tenant, user, payload.integrationId, { active: payload.active });
      return {
        success: true,
        message: `Integration ${payload.active ? 'activated' : 'deactivated'} successfully`,
        integration: result
      };
    } catch (error: any) {
      logger.error('Error in toggleIntegrationStatusCalling:', error);
      return { error: error.message || 'Failed to toggle integration status' };
    }
  }
};

export const removeIntegrationCalling = {
  type: 'function',
  name: 'remove_integration',
  description: 'Remove an integration',
  function: {
    name: 'remove_integration',
    description: 'Remove an integration',
    parameters: {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'ID of the integration to remove'
        }
      },
      required: ['integrationId']
    },
  },
  handler: async (req, payload = { integrationId: '' }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.integrationId) {
      return { error: "Integration ID is required" };
    }

    try {
      const result = await removeIntegration(tenant, user, payload.integrationId);
      return { success: true, message: 'Integration removed successfully', result };
    } catch (error: any) {
      logger.error('Error in removeIntegrationCalling:', error);
      return { error: error.message || 'Failed to remove integration' };
    }
  }
};

export const listIntegrationsCalling = {
  type: 'function',
  name: 'get_integrations_list',
  description: 'Get a list of integrations filtered by kind',
  function: {
    name: 'get_integrations_list',
    description: 'Get a list of integrations filtered by kind',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['qelos', 'openai', 'email', 'n8n', 'supabase', 'linkedin', 'http', 'claudeai', 'facebook'],
          description: 'Filter by target connection kind'
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status'
        }
      }
    }
  },
  handler: async (req, payload = { kind: undefined, active: undefined }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    try {
      // Build query object
      const query: Record<string, any> = {};

      if (payload.kind) query['kind'] = payload.kind;
      if (payload.active !== undefined) query.active = payload.active;

      const integrations = await getIntegrations(tenant, user, query);
      return integrations;
    } catch (error: any) {
      logger.error('Error in listIntegrationsCalling:', error);
      return { error: error.message || 'Failed to list integrations' };
    }
  }
};

export const getWebhookSampleCalling = {
  type: 'function',
  name: 'get_webhook_sample',
  description: 'Get a sample of a Qelos webhook by source, kind, and event name',
  function: {
    name: 'get_webhook_sample',
    description: 'Get a sample of a Qelos webhook by source, kind, and event name',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source of the webhook (e.g., blueprint, user)'
        },
        kind: {
          type: 'string',
          description: 'Kind of the webhook (e.g., create, update, delete)'
        },
        eventName: {
          type: 'string',
          description: 'Name of the event (e.g., blueprint name)'
        }
      },
      required: ['source', 'kind', 'eventName']
    },
  },
  handler: async (req, payload = { source: '', kind: '', eventName: '' }) => {
    const tenant = req.headers.tenant;
    const user = req.headers.user;

    if (!payload.source || !payload.kind || !payload.eventName) {
      return { error: "Source, kind, and event name are required" };
    }

    try {
      const sample = await getWebhookSample(tenant, user, payload.source, payload.kind, payload.eventName);
      if (sample) {
        return sample;
      }
      return { error: 'Failed to get webhook sample' };
    } catch (error: any) {
      logger.error('Error in getWebhookSampleCalling:', error);
      return { error: error.message || 'Failed to get webhook sample' };
    }
  }
};

export const buildDataManipulationCalling = {
  type: 'function',
  name: 'build_data_manipulation',
  description: 'Build a data manipulation array based on trigger data and target expected data',
  function: {
    name: 'build_data_manipulation',
    description: 'Build a data manipulation array based on trigger data and target expected data',
    parameters: {
      type: 'object',
      properties: {
        triggerSample: {
          type: 'object',
          description: 'Sample data from the trigger'
        },
        targetSchema: {
          type: 'object',
          description: 'Expected schema for the target'
        },
        includePopulate: {
          type: 'boolean',
          description: 'Whether to include populate steps for Qelos entities',
          default: false
        }
      },
      required: ['triggerSample', 'targetSchema']
    },
  },
  handler: async (req, payload = { triggerSample: {}, targetSchema: {}, includePopulate: false }) => {
    if (!payload.triggerSample || !payload.targetSchema) {
      return { error: "Trigger sample and target schema are required" };
    }

    try {
      // Generate data manipulation steps by analyzing trigger sample and target schema
      const dataManipulation: IDataManipulationStep[] = [];

      // Create a mapping step
      const mapStep: IDataManipulationStep = {
        map: {},
        populate: {} // Required by IDataManipulationStep type
      };

      // Analyze target schema and create mappings
      const targetKeys = Object.keys(payload.targetSchema);
      const triggerKeys = Object.keys(payload.triggerSample);

      // For each target key, try to find a matching source key
      for (const targetKey of targetKeys) {
        // Look for exact match
        if (triggerKeys.includes(targetKey)) {
          mapStep.map[targetKey] = `.${targetKey}`;
          continue;
        }

        // Look for case-insensitive match
        const lowerTargetKey = targetKey.toLowerCase();
        const matchingKey = triggerKeys.find(k => k.toLowerCase() === lowerTargetKey);
        if (matchingKey) {
          mapStep.map[targetKey] = `.${matchingKey}`;
          continue;
        }

        // If no match found, add a placeholder
        mapStep.map[targetKey] = `null // TODO: Map this field from trigger data`;
      }

      dataManipulation.push(mapStep);

      // Add populate step if requested
      if (payload.includePopulate) {
        dataManipulation.push({
          map: {},
          populate: {
            // Example populate for user data
            user: { source: 'user' }
          }
        });
      }

      return dataManipulation;
    } catch (error: any) {
      logger.error('Error in buildDataManipulationCalling:', error);
      return { error: error.message || 'Failed to build data manipulation' };
    }
  }
};
