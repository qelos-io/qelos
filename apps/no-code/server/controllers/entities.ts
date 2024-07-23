import qs from 'qs'
import { v4 as uuidv4 } from 'uuid';
import BlueprintEntity, { IBlueprintEntity } from '../models/blueprint-entity';
import { IBlueprint } from '../models/blueprint';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { CRUDOperation, PermissionScope } from '@qelos/global-types';
import mongoose from 'mongoose';
import logger from '../services/logger';
import { getValidBlueprintMetadata, updateEntityMapping, validateEntityRelations, } from '../services/entities.service';
import { getUserPermittedScopes } from '../services/entities-permissions.service';
import { emitPlatformEvent } from '@qelos/api-kit';

type Full<T> = {
  [P in keyof T]-?: T[P];
}

function getEntityQuery({ entityIdentifier, blueprint, req, permittedScopes }: {
  entityIdentifier?: string,
  blueprint: IBlueprint,
  req: Full<RequestWithUser>,
  permittedScopes: PermissionScope[] | true
}) {
  const query: any = {
    tenant: req.headers.tenant,
    blueprint: blueprint.identifier,
  };
  if (entityIdentifier) {
    query.identifier = entityIdentifier;
  }
  if (permittedScopes instanceof Array) {
    if (!permittedScopes.includes(PermissionScope.TENANT)) {
      if (blueprint.permissionScope === PermissionScope.WORKSPACE) {
        if (!req.workspace) {
          throw new Error('user is not connected to a workspace');
        }
        query.workspace = req.workspace._id
      } else if (blueprint.permissionScope === PermissionScope.USER) {
        query.user = req.user._id
      }
    }
  }
  return query;
}

async function updateAllEntityMetadata(req: RequestWithUser, blueprint: IBlueprint, entity: IBlueprintEntity) {
  const body = req.body || {}

  // validate the metadata
  entity.metadata = getValidBlueprintMetadata(body.metadata, blueprint);

  // run the update mapping pre-save
  await updateEntityMapping(blueprint, entity);

  // validate the relations
  await validateEntityRelations(req.headers.tenant, blueprint, entity);
}

export async function getAllBlueprintEntities(req, res) {
  const blueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.READ, req.query.bypassAdmin);

  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  try {
    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
    const query = {
      ...qs.parse(req._parsedUrl.query, { depth: 3 }),
      ...getEntityQuery({ blueprint, req, permittedScopes })
    }
    if ('bypassAdmin' in req.query) {
      delete query.bypassAdmin;
    }
    const entities = await BlueprintEntity.find(query)
      .lean()
      .exec()

    res.json(entities).end();
  } catch (err) {
    logger.log('entities error', err);
    res.status(500).json({ message: 'something went wrong with entities' }).end();
  }
}

export async function getSingleBlueprintEntity(req, res) {
  const entityIdentifier = req.params.entityIdentifier;
  const blueprint: IBlueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.READ, req.query.bypassAdmin === 'true');
  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  const query = getEntityQuery({ blueprint, req, entityIdentifier, permittedScopes })
  try {
    const entity = await BlueprintEntity.findOne(query)
      .lean()
      .exec()

    if (!entity) {
      res.status(404).json({ message: 'entity not found' }).end();
      return;
    }
    res.json(entity).end();
  } catch {
    res.status(500).json({ message: 'something went wrong with entity' }).end();
  }
}

export async function createBlueprintEntity(req, res) {
  const blueprint: IBlueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.CREATE, req.query.bypassAdmin === 'true');
  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  let user = req.user._id;
  let workspace = req.workspace?._id;
  if (permittedScopes === true) {
    if (req.body.user) {
      user = req.body.user;
    }
    if (req.body.workspace) {
      workspace = req.body.workspace;
    }
  }
  try {
    const entity = new BlueprintEntity({
      tenant: req.headers.tenant,
      blueprint: blueprint.identifier,
      identifier: blueprint.entityIdentifierMechanism === 'objectid' ? new mongoose.Types.ObjectId() : uuidv4(),
      user,
      workspace,
      metadata: {},
    });

    await updateAllEntityMetadata(req, blueprint, entity);

    await entity.save();
    if (blueprint.dispatchers?.create) {
      emitPlatformEvent({
        tenant: entity.tenant,
        user: entity.user.toString(),
        source: 'blueprints',
        kind: blueprint.identifier,
        eventName: 'create',
        description: `${blueprint.name} created`,
        metadata: {
          workspace: entity.workspace.toString(),
          entity: entity.identifier,
          blueprint: blueprint.identifier,
        },
      }).catch(logger.error);
    }

    res.status(200).json(entity).end()
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'something went wrong with entity creation' }).end();
  }
}

export async function updateBlueprintEntity(req, res) {
  const entityIdentifier = req.params.entityIdentifier;
  const blueprint: IBlueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.UPDATE, req.query.bypassAdmin === 'true');
  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  const query = getEntityQuery({ blueprint, req, entityIdentifier, permittedScopes });
  if (permittedScopes === true) {
    if (req.body.user) {
      query.user = req.body.user;
    }
    if (req.body.workspace) {
      query.workspace = req.body.workspace;
    }
  }
  let entity: IBlueprintEntity
  try {
    const givenEntity = await BlueprintEntity.findOne(query).exec()

    if (!givenEntity) {
      if (!givenEntity) {
        res.status(404).json({ message: 'entity not found' }).end();
        return;
      }
    }
    entity = givenEntity;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'something went wrong with entity' }).end();
    return;
  }
  try {
    await updateAllEntityMetadata(req, blueprint, entity);

    const modifiedFields = blueprint.dispatchers?.update && entity.modifiedPaths({ includeChildren: true });

    await entity.save();

    if (blueprint.dispatchers?.update) {
      emitPlatformEvent({
        tenant: entity.tenant,
        user: entity.user.toString(),
        source: 'blueprints',
        kind: blueprint.identifier,
        eventName: 'update',
        description: `${blueprint.name} updated`,
        metadata: {
          workspace: entity.workspace.toString(),
          entity: entity.identifier,
          blueprint: blueprint.identifier,
          modifiedFields,
        },
      }).catch(logger.error);
    }

    res.status(200).json(entity).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({ message: 'something went wrong with entity' }).end();
  }
}

export async function removeBlueprintEntity(req, res) {
  const entityIdentifier = req.params.entityIdentifier;
  const blueprint: IBlueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.DELETE, req.query.bypassAdmin === 'true');
  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  const query = getEntityQuery({ blueprint, req, entityIdentifier, permittedScopes });
  if (permittedScopes === true) {
    if (req.body.user) {
      query.user = req.body.user;
    }
    if (req.body.workspace) {
      query.workspace = req.body.workspace;
    }
  }
  try {
    const entity = await BlueprintEntity.findOne(query)
      .lean()
      .exec()

    if (!entity) {
      res.status(404).json({ message: 'entity not found' }).end();
      return;
    }
    await BlueprintEntity.deleteOne(query).exec();

    if (blueprint.dispatchers?.update) {
      emitPlatformEvent({
        tenant: entity.tenant,
        user: entity.user.toString(),
        source: 'blueprints',
        kind: blueprint.identifier,
        eventName: 'delete',
        description: `${blueprint.name} deleted`,
        metadata: {
          workspace: entity.workspace.toString(),
          entity: entity.identifier,
          blueprint: blueprint.identifier,
        },
      }).catch(logger.error);
    }

    res.json(entity).end();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'something went wrong with entity deletion' }).end();
  }
}