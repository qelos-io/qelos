import {FastifyReply} from 'fastify/types/reply';
import {addProxyEndpoint} from './endpoints';
import {ResponseError} from './response-error';
import logger from './logger';
import manifest from './manifest';
import {Crud, ICrudOptions, ResourceProperty, ResourceSchema} from './crud.types';
import {addGroupedMicroFrontends} from './micro-frontends';
import {getSdkForTenant} from './sdk';

export function getPlural(word: string) {
  const lastChar = word[word.length - 1].toLowerCase();
  if (['x', 'h', 's'].includes(lastChar)) {
    return word + 'es';
  }
  if (lastChar === 'y') {
    return word.substring(0, word.length - 1) + 'ies';
  }
  return word + 's';
}

export function getDisplayNames(name: string) {
  const plural = getPlural(name.toLowerCase());
  const capitalized = name.split(' ').map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  const capitalizedPlural = getPlural(capitalized);

  return {
    name,
    plural,
    capitalized,
    capitalizedPlural
  }
}

function isPropValidToDisplay(value, propSchema: ResourceSchema | ResourceProperty, dest: 'list' | 'single') {
  return (propSchema.public &&
    !(propSchema.hideInList && dest === 'list') &&
    (
      typeof propSchema.type === 'undefined' ||
      (propSchema.type === null && value === null) ||
      value?.constructor === propSchema.type
    ))
}

function fillFromSchema(exposed: any, item: any, schema: ResourceSchema, dest: 'list' | 'single' = 'single') {
  for (const key in schema) {
    const prop = schema[key];
    const value = item[key];
    if (isPropValidToDisplay(value, prop.schema, dest)) {
      if (prop.schema && prop.type === Object) {
        exposed[key] = {}
        fillFromSchema(exposed[key], value, prop.schema as ResourceSchema);
      } else if (prop.schema && prop.type === Array && value instanceof Array) {
        exposed[key] = [];
        value.forEach(row => {
          if (prop.schema.type) {
            // consider to be a direct property;
            if (isPropValidToDisplay(row, prop.schema, dest)) {
              exposed[key].push(row);
            }
          } else {
            // consider to be an object schema
            const item = {};
            fillFromSchema(item, row, prop.schema as ResourceSchema);
            exposed[key].push(item);
          }
        })
      } else {
        exposed[key] = value;
      }
    }
  }
}

function getJsonSchema(schema: ResourceSchema) {
  const json: any = {};
  for (const key in schema) {
    json[key] = {
      ...schema[key],
      // @ts-ignore
      type: schema[key].type?.name
    }
    if (schema[key].schema) {
      schema[key].schema = getJsonSchema({data: schema[key].schema}).data;
    }
  }
  return json;
}

function getValidatedItem(item: any = {}, schema) {
  if (!schema) {
    return item;
  }
  const valid = {};
  for (const key in schema) {
    const prop = schema[key];
    const value = item[key];
    if (
      typeof prop.type === 'undefined' ||
      (prop.type === null && value === null) ||
      value?.constructor === prop.type
    ) {
      if (prop.schema && prop.type === Object) {
        valid[key] = getValidatedItem(value, prop.schema);
      } else {
        valid[key] = item[key];
      }
    }
  }
  return valid;
}

export function createCrud<ResourcePublicData = any, ResourceInsertData = any>(
  options: ICrudOptions<ResourcePublicData, ResourceInsertData>) {

  const display = getDisplayNames(options.display.name);

  const screens = {
    list: {},
    create: {},
    edit: {},
    ...options.screens,
  }

  const crudOptions: ICrudOptions<ResourcePublicData, ResourceInsertData> & Crud = {
    name: display.plural.replaceAll(' ', '-'),
    identifierKey: '_id',
    dispatchPrefix: options.dispatchPrefix === false ? options.dispatchPrefix : options.dispatchPrefix || manifest.name,
    verify: async () => null,
    ...options,
    display: {
      ...display,
      ...options.display
    },
    screens: {
      list: {
        use: screens.list.use || 'rows-list',
        structure: screens.list.structure,
      },
      create: {
        use: screens.create.use || 'basic-form',
        structure: screens.create.structure
      },
      edit: {
        use: screens.edit.use || 'basic-form',
        structure: screens.edit.structure,
      },
    },
    nav: options.nav || {}
  };

  function getPublicData(item = {}) {
    const exposed = {[crudOptions.identifierKey]: item[crudOptions.identifierKey]}
    fillFromSchema(exposed, item, crudOptions.schema);
    return exposed;
  }

  function getPublicDataForList(item = {}) {
    const exposed = {[crudOptions.identifierKey]: item[crudOptions.identifierKey]}
    fillFromSchema(exposed, item, crudOptions.schema, 'list');
    return exposed;
  }

  function handleError(err: Error, reply: FastifyReply) {
    if (err instanceof ResponseError) {
      logger.error(err);
      reply.statusCode = err.status;
      return {message: err.responseMessage};
    }
    throw err;
  }

  const itemPath = crudOptions.name + '/:id';
  const singlePath = crudOptions.display.name.toLowerCase().replaceAll(' ', '-');

  async function triggerOperation(req, kind, metadata) {
    if (crudOptions.dispatchPrefix) {
      const sdk = await getSdkForTenant(req.tenantPayload);
      sdk?.events.dispatch({
        source: `${crudOptions.dispatchPrefix}:${crudOptions.name}`,
        kind,
        eventName: `${kind}-${singlePath}`,
        user: req.user._id,
        metadata,
      })
    }
  }

  // get one
  addProxyEndpoint(itemPath, {
    verifyToken: true,
    method: 'GET',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const id: string = (req.params as any).id || '';
        const item = await crudOptions.readOne(id, req, reply);

        if (!crudOptions.schema) {
          return item;
        }

        return getPublicData(item);

      } catch (err) {
        return handleError(err, reply);
      }
    }
  })

  // update one
  addProxyEndpoint(itemPath, {
    verifyToken: true,
    method: 'PUT',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const id: string = (req.params as any).id || '';
        const item = await crudOptions.updateOne(id, getValidatedItem(req.body, crudOptions.schema), req, reply);
        triggerOperation(req, 'update', item).catch();
        if (!crudOptions.schema) {
          return item;
        }

        return getPublicData(item);

      } catch (err) {
        return handleError(err, reply);
      }
    }
  })

  // delete one
  addProxyEndpoint(itemPath, {
    verifyToken: true,
    method: 'DELETE',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const id: string = (req.params as any).id || '';
        const item = await crudOptions.deleteOne(id, req, reply);
        triggerOperation(req, 'delete', item).catch();
        if (!crudOptions.schema) {
          return item;
        }

        return getPublicData(item);

      } catch (err) {
        return handleError(err, reply);
      }
    }
  })

  // create one
  addProxyEndpoint(crudOptions.name, {
    verifyToken: true,
    method: 'POST',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const item = await crudOptions.createOne(getValidatedItem(req.body, crudOptions.schema), req, reply);
        triggerOperation(req, 'create', item).catch();
        if (!crudOptions.schema) {
          return item;
        }

        return getPublicData(item);

      } catch (err) {
        return handleError(err, reply);
      }
    }
  })

  // get many
  addProxyEndpoint(crudOptions.name, {
    verifyToken: true,
    method: 'GET',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const list = await crudOptions.readMany((req.query || {}) as Record<string, string | string[]>, req, reply);

        if (!crudOptions.schema) {
          return list;
        }

        return list.map(getPublicData);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  })

  manifest.cruds.push({
    name: crudOptions.name,
    display: crudOptions.display,
    identifierKey: crudOptions.identifierKey,
    schema: getJsonSchema(crudOptions.schema),
  });

  addGroupedMicroFrontends(
    {name: crudOptions.display.capitalizedPlural, key: crudOptions.name, ...crudOptions.nav},
    [
      {
        name: 'List',
        crud: crudOptions.name,
        description: 'List of ' + crudOptions.display.capitalizedPlural,
        use: crudOptions.screens.list.use,
        route: {
          name: crudOptions.name + '-list',
          path: crudOptions.name,
          navBarPosition: 'top'
        }
      },
      {
        name: 'Create',
        crud: crudOptions.name,
        description: 'Create a new ' + crudOptions.display.capitalized,
        use: crudOptions.screens.create.use,
        route: {
          name: 'add-' + singlePath,
          path: 'add-' + singlePath,
          navBarPosition: 'top'
        }
      },
      {
        name: 'Edit',
        crud: crudOptions.name,
        description: 'Edit existing ' + crudOptions.display.capitalized,
        use: crudOptions.screens.edit.use,
        route: {
          name: 'edit-' + singlePath,
          path: `edit-${singlePath}/:id`,
          navBarPosition: false
        }
      }
    ]
  )
}