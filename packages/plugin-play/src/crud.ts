import {FastifyReply} from 'fastify/types/reply';
import {addProxyEndpoint} from './endpoints';
import {ResponseError} from './response-error';
import logger from './logger';
import manifest from './manifest';
import {Crud, ICrudOptions, ResourceProperty, ResourceSchema, Screen} from './crud.types';
import {addGroupedMicroFrontends, NavBarPosition} from './micro-frontends';
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

function getMfeScreenOptions(name: string, crud: string, screen: Screen) {
  return {
    name,
    crud,
    use: screen.use,
    structure: screen.structure,
    roles: screen.roles,
    workspaceRoles: screen.workspaceRoles,
  }
}

function isPropValidToDisplay(value, propSchema: ResourceSchema | ResourceProperty, dest: 'list' | 'single') {
  return (propSchema?.public &&
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
    if (isPropValidToDisplay(value, prop, dest)) {
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
    view: {},
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
      list: screens.list === false ? screens.list : {
        use: screens.list.use || 'rows-list',
        structure: screens.list.structure,
      },
      create: screens.create === false ? screens.create : {
        use: screens.create.use || 'basic-form',
        structure: screens.create.structure
      },
      edit: screens.edit === false ? screens.edit : {
        use: screens.edit.use || 'basic-form',
        structure: screens.edit.structure,
      },
      view: screens.view === false ? screens.view : {
        use: screens.view.use || 'basic-form',
        structure: screens.view.structure,
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

        return list.map(getPublicDataForList);
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
      crudOptions.screens.list && {
        ...getMfeScreenOptions('List', crudOptions.name, crudOptions.screens.list),
        description: 'List of ' + crudOptions.display.capitalizedPlural,
        route: {
          name: crudOptions.name + '-list',
          path: crudOptions.name,
          navBarPosition: NavBarPosition.TOP
        }
      },
      crudOptions.screens.create && {
        ...getMfeScreenOptions('Create', crudOptions.name, crudOptions.screens.create),
        description: 'Create a new ' + crudOptions.display.capitalized,
        route: {
          name: 'add-' + singlePath,
          path: 'add-' + singlePath,
          navBarPosition: NavBarPosition.TOP
        }
      },
      crudOptions.screens.edit && {
        ...getMfeScreenOptions('Edit', crudOptions.name, crudOptions.screens.edit),
        description: 'Edit existing ' + crudOptions.display.capitalized,
        route: {
          name: 'edit-' + singlePath,
          path: `edit-${singlePath}/:id`,
          navBarPosition: false
        }
      },
      crudOptions.screens.view && {
        ...getMfeScreenOptions('View', crudOptions.name, crudOptions.screens.view),
        description: 'View existing ' + crudOptions.display.capitalized,
        route: {
          name: 'view-' + singlePath,
          path: `view-${singlePath}/:id`,
          navBarPosition: false
        }
      }
    ]
  )
}