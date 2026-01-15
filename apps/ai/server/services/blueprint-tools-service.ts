import { IBlueprint } from "@qelos/global-types";

export interface BlueprintTool {
  type: 'function';
  description: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Convert tools integrations to function tools format
 */
export function mapToolsIntegrations(toolsIntegrations: any[]): BlueprintTool[] {
  return toolsIntegrations.map(tool => ({
    type: 'function',
    description: tool.trigger.details.description,
    function: {
      name: tool.trigger.details.name,
      description: tool.trigger.details.description,
      parameters: {
        properties: {},
        ...tool.trigger.details.parameters,
      },
    }
  }));
}

/**
 * Helper function to convert blueprint property type to JSON Schema type
 */
function getJsonSchemaType(blueprintType: string): { type: string, format?: string } {
  switch (blueprintType.toLowerCase()) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date' };
    case 'datetime':
      return { type: 'string', format: 'date-time' };
    case 'time':
      return { type: 'string', format: 'time' };
    case 'object':
      return { type: 'object' };
    case 'file':
      return { type: 'string', format: 'uri' }; // File is represented as a URL
    default:
      return { type: 'string' }; // Default to string for unknown types
  }
}

/**
 * Generate CRUD function tools for a blueprint
 */
export function generateBlueprintTools(blueprint: IBlueprint): BlueprintTool[] {
  // Create JSON schema for blueprint properties
  const propertiesSchema = Object.entries(blueprint.properties).reduce((schema, [propName, propDesc]) => {
    const typeInfo = getJsonSchemaType(propDesc.type);

    let propSchema: any = {
      ...typeInfo,
      description: propDesc.description || propDesc.title
    };

    // Handle enum values
    if (propDesc.enum && propDesc.enum.length > 0) {
      propSchema.enum = propDesc.enum;
    }

    if (typeInfo.type === 'object') {
      propSchema = propDesc.schema;
      propSchema.description ||= propDesc.description;
    }

    if (propDesc.multi) {
      propSchema.type = 'array';
      propSchema.items = {
        ...typeInfo,
        description: propDesc.description || propDesc.title
      };
    }

    // Handle min/max for numbers
    if (propDesc.type.toLowerCase() === 'number') {
      if (propDesc.min !== undefined) propSchema.minimum = propDesc.min;
      if (propDesc.max !== undefined) propSchema.maximum = propDesc.max;
    }

    schema[propName] = propSchema;
    return schema;
  }, {});

  // Generate CRUD function tools for this blueprint
  return [
    // Create entity function
    {
      type: 'function',
      description: `Create a new ${blueprint.name} entity`,
      function: {
        name: `create_${blueprint.identifier}`,
        description: `Create a new ${blueprint.name} entity. ${blueprint.description || ''}`,
        parameters: {
          type: 'object',
          properties: propertiesSchema,
          required: Object.entries(blueprint.properties)
            .filter(([_, prop]) => prop.required)
            .map(([name, _]) => name)
        }
      }
    },
    // Get entity function
    {
      type: 'function',
      description: `Get a specific ${blueprint.name} entity by identifier`,
      function: {
        name: `get_${blueprint.identifier}`,
        description: `Retrieve a specific ${blueprint.name} entity by its identifier`,
        parameters: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: `The identifier of the ${blueprint.name} entity to retrieve`
            }
          },
          required: ['identifier']
        }
      }
    },
    // Update entity function
    {
      type: 'function',
      description: `Update an existing ${blueprint.name} entity by identifier`,
      function: {
        name: `update_${blueprint.identifier}`,
        description: `Update an existing ${blueprint.name} entity with new values`,
        parameters: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: `The identifier of the ${blueprint.name} entity to update`
            },
            ...propertiesSchema
          },
          required: ['identifier']
        }
      }
    },
    // Delete entity function
    {
      type: 'function',
      description: `Delete a ${blueprint.name} entity by identifier`,
      function: {
        name: `delete_${blueprint.identifier}`,
        description: `Delete a ${blueprint.name} entity by its identifier`,
        parameters: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: `The identifier of the ${blueprint.name} entity to delete`
            }
          },
          required: ['identifier']
        }
      }
    },
    // List entities function
    {
      type: 'function',
      description: `List ${blueprint.name} entities`,
      function: {
        name: `list_${blueprint.identifier}`,
        description: `Retrieve a list of ${blueprint.name} entities, optionally filtered by query parameters`,
        parameters: {
          type: 'object',
          properties: {
            $sort: {
              type: 'string',
              description: 'Sort the results by this field. add "minus" to sort in descending order (e.g. "-rank"). default: "-created"',
              enum: ['created', 'updated', ...Object.keys(blueprint.properties).map(prop => ['metadata' + prop, '-metadata.' + prop]).flat()]
            },
            $page: {
              type: 'number',
              description: 'the page number to return. default: 1'
            },
            $limit: {
              type: 'number',
              description: 'Limit the number of results. default: 100'
            },
            $populate: {
              type: 'boolean',
              description: 'Populate the results. default: false. if true, the results will be populated with the blueprint relations.'
            },
            $fields: {
              description: 'selected fields to get from each entity. when given - only those filters will return.',
            },
            createdFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Filter by created date from. default: null'
            },
            createdTo: {
              type: 'string',
              format: 'date-time',
              description: 'Filter by created date to. default: null'
            },
            updatedFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Filter by updated date from. default: null'
            },
            updatedTo: {
              type: 'string',
              format: 'date-time',
              description: 'Filter by updated date to. default: null'
            },
            ...Object.keys(blueprint.properties).reduce((acc, prop) => {
              acc[prop] = {
                ...propertiesSchema[prop],
                description: `Filter by ${prop}. ${blueprint.properties[prop].description || ''}`
              }
              return acc;
            }, {} as any)
          },
          required: []
        }
      }
    }
  ];
}
