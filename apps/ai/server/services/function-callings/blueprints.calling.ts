import { IBlueprint, IBlueprintPropertyDescriptor } from "@qelos/global-types";
import { getAllBlueprints, createBlueprint } from "../no-code-service";

export const getBlueprintsCalling =  {
    type: 'function',
    name: 'getBlueprints',
    description: 'Get list of blueprints for the application. Returns an array of blueprints. blueprints consider to be the data models of the application.',
    function: {
      name: 'getBlueprints',
      description: 'Get list of blueprints for the application. Returns an array of blueprints. blueprints consider to be the data models of the application.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: [],
      },
     },
     handler: async (req, payload = { name: undefined, description: undefined }) => {
      const tenant = req.headers.tenant;
      const query: Record<string, any> = {}
      if (typeof payload.name === 'string') {
        query.name = { $regex: payload.name, $options: 'i' }
      }
      if (typeof payload.description === 'string') {
        query.description = { $regex: payload.description, $options: 'i' }
      }

      const list = await getAllBlueprints(tenant, query);

      return list;
     }
  }

export const createBlueprintCalling = {
    type: 'function',
    name: 'createBlueprint',
    description: 'Create a new blueprint (also known as db table) for the application. name, identifier, fields are required. each field must have key title, and type (string, number, boolean, date, datetime, time, object, file). If some data is missing - keep ask the user for it. Returns the created blueprint.',
    function: {
      name: 'createBlueprint',
      description: 'Create a new blueprint for the application. Returns the created blueprint.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Unique identifier for the blueprint / data model. use the name and remove spaces and special characters.' },
          name: { 
            type: 'string', 
            description: 'Name of the blueprint. MUST BE IN SINGULAR FORM. Examples: User (not Users), Product (not Products), Order (not Orders). If the name is plural, it will be rejected.',
            examples: ['User', 'Product', 'Order', 'Customer', 'Invoice']
          },
          description: { type: 'string', description: 'Optional description of the blueprint' },
          permissions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scope: { type: 'string', enum: ['user', 'workspace', 'tenant'], description: 'Permission scope' },
                operation: { type: 'string', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation' },
                guest: { type: 'boolean', description: 'Whether guests have this permission' },
                roleBased: { type: 'array', items: { type: 'string' }, description: 'Role-based permissions' },
                workspaceRoleBased: { type: 'array', items: { type: 'string' }, description: 'Workspace role-based permissions' },
                workspaceLabelsBased: { type: 'array', items: { type: 'string' }, description: 'Workspace labels-based permissions' }
              }
            },
            description: 'Permission descriptors for the blueprint'
          },
          permissionScope: { 
            type: 'string', 
            enum: ['user', 'workspace', 'tenant'],
            description: 'Scope of permissions for this blueprint' 
          },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Property key' },
                title: { type: 'string', description: 'Property title' },
                type: { 
                  type: 'string', 
                  enum: ['string', 'number', 'boolean', 'date', 'datetime', 'time', 'object', 'file'],
                  description: 'Property type. can be string, number, boolean, date, datetime, time, object, file.' 
                },
                description: { type: 'string', description: 'Property description' },
                required: { type: 'boolean', description: 'Whether the property is required' },
                enum: { type: 'array', items: { type: 'string' }, description: 'Possible values for the property' },
                multi: { type: 'boolean', description: 'Whether multiple values are allowed' },
                min: { type: 'number', description: 'Minimum value for number properties' },
                max: { type: 'number', description: 'Maximum value for number properties' },
                schema: { type: 'object', description: 'Schema for object properties' }
              },
              required: ['key', 'title', 'type', 'description', 'required']
            },
            description: 'Property descriptors for the blueprint. create at least one property.'
          },
          updateMapping: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Mapping for update operations'
          },
          relations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Relation key' },
                target: { type: 'string', description: 'Target of the relation' }
              },
              required: ['key', 'target']
            },
            description: 'Relations to other blueprints'
          },
          limitations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scope: { type: 'string', enum: ['user', 'workspace', 'tenant'], description: 'Limitation scope' },
                workspaceLabels: { type: 'array', items: { type: 'string' }, description: 'Workspace labels for the limitation' },
                roles: { type: 'array', items: { type: 'string' }, description: 'Roles for the limitation' },
                properties: { type: 'array', items: { type: 'string' }, description: 'Properties affected by the limitation' },
                value: { type: 'number', description: 'Limitation value' }
              },
              required: ['scope', 'workspaceLabels', 'roles', 'value']
            },
            description: 'Limitations for the blueprint'
          },
        },
        required: ['identifier', 'name', 'permissions', 'permissionScope', 'fields', 'updateMapping', 'relations']
      },
    },
    handler: async (req, payload: Partial<IBlueprint & { fields: Record<string, any> | Array<any> }> = {}) => {
      if (!payload.name) {
        return {
          error: 'property "name" is required'
        }
      }
      if (!payload.identifier) {
        return {
          error: 'property "identifier" is required'
        }
      }

      if (!payload.fields || payload.fields.length === 0) {
        return {
          error: 'property "fields" is required and must contain at least one field'
        }
      }

      payload.properties = payload.fields.reduce((acc, field) => {
        acc[field.key || field.name] = field;
        if (!field.title) {
          field.title = field.name;
          delete field.name;
        }
        return acc;
      }, {} as Record<string, IBlueprintPropertyDescriptor>);

      payload.dispatchers = {
        create: true,
        update: true,
        delete: true
      }

      const tenant = req.headers.tenant;
      const blueprint = await createBlueprint(tenant, payload);

      return blueprint;
    }
  }