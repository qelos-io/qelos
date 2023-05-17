import {FastifyReply} from 'fastify/types/reply';
import {addProxyEndpoint} from './endpoints';
import {ResponseError} from './response-error';
import logger from './logger';
import manifest from './manifest';
import {Crud, ICrudOptions} from './crud.types';
import {addGroupedMicroFrontends} from './micro-frontends';

function getPlural(word: string) {
  const lastChar = word[word.length - 1].toLowerCase();
  if (['x', 'h', 's'].includes(lastChar)) {
    return word + 'es';
  }
  if (lastChar === 'y') {
    return word.substring(0, word.length - 1) + 'ies';
  }
  return word + 's';
}

function getDisplayNames(name: string) {
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
    crudOptions.publicKeys.forEach(key => exposed[key] = item[key]);
    return exposed;
  }

  function handleError(err: Error, reply: FastifyReply) {
    if (err instanceof ResponseError) {
      logger.error(err);
      reply.statusCode = err.status;
      return err.responseMessage;
    }
    throw err;
  }

  const itemPath = crudOptions.name + '/:id';

  // get one
  addProxyEndpoint(itemPath, {
    verifyToken: true,
    method: 'GET',
    handler: async (req, reply) => {
      try {
        await crudOptions.verify(req, reply);
        const id: string = (req.params as any).id || '';
        const item = await crudOptions.readOne(id, req, reply);

        if (!crudOptions.publicKeys) {
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
        const item = await crudOptions.updateOne(id, req.body as ResourceInsertData, req, reply);

        if (!crudOptions.publicKeys) {
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

        if (!crudOptions.publicKeys) {
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
        const item = await crudOptions.createOne(req.body as ResourceInsertData, req, reply);

        if (!crudOptions.publicKeys) {
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

        if (!crudOptions.publicKeys) {
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
    display: crudOptions.display
  });

  const singlePath = crudOptions.display.name.toLowerCase().replaceAll(' ', '-');

  addGroupedMicroFrontends(
    {name: crudOptions.display.capitalizedPlural, key: crudOptions.name, ...crudOptions.nav},
    [
      {
        name: 'List',
        crud: crudOptions.name,
        description: 'List of ' + crudOptions.display.capitalizedPlural,
        use: crudOptions.screens.list.use,
        route: {
          name: 'List',
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
          name: 'Create',
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
          name: 'Edit',
          path: `edit-${singlePath}/:id`,
          navBarPosition: false
        }
      }
    ]
  )
}