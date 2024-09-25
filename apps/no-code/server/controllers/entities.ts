import qs from 'qs'
import { v4 as uuidv4 } from 'uuid';
import BlueprintEntity, { IBlueprintEntity } from '../models/blueprint-entity';
import { IBlueprint } from '../models/blueprint';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { CRUDOperation, PermissionScope } from '@qelos/global-types';
import mongoose from 'mongoose';
import logger from '../services/logger';
import {
  getEntityQuery,
  getValidBlueprintMetadata,
  updateEntityMapping,
  validateEntityRelations,
} from '../services/entities.service';
import { getUserPermittedScopes } from '../services/entities-permissions.service';
import { emitPlatformEvent } from '@qelos/api-kit';
import { ResponseError } from '../services/response-error';

async function updateAllEntityMetadata(req: RequestWithUser, blueprint: IBlueprint, entity: IBlueprintEntity) {
  const body = req.body || {}

  // validate the metadata
  entity.metadata = getValidBlueprintMetadata(body.metadata, blueprint);

  // run the update mapping pre-save
  await updateEntityMapping(blueprint, entity);

  // validate the relations
  await validateEntityRelations(req.headers.tenant, blueprint, entity);
}

async function hasReachedLimitations(req: RequestWithUser, blueprint: IBlueprint, entity: any) {
  if (!blueprint.limitations?.length) {
    return false;
  }

  const results = await Promise.all(blueprint.limitations.map(async limit => {
    const limitedProps = limit.properties?.reduce((map, prop) => {
      map[`metadata.${prop}`] = entity.metadata[prop];
      return map;
    }, {});
    const query: any = {
      tenant: req.headers.tenant,
      blueprint: blueprint.identifier,
      ...(limitedProps || {})
    }
    if (limit.scope === PermissionScope.WORKSPACE) {
      query.workspace = entity.workspace;
    } else if (limit.scope === PermissionScope.USER) {
      query.user = entity.user;
    }
    const existingEntities = await BlueprintEntity.countDocuments(query).lean().exec();
    if (existingEntities >= limit.value) {
      return true;
    }
  }))
  return results.includes(true);
}

export async function getAllBlueprintEntities(req, res) {
  const blueprint = req.blueprint as IBlueprint;
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
    delete query.$populate;
    if ('bypassAdmin' in req.query) {
      delete query.bypassAdmin;
    }
    const entities = await BlueprintEntity.find(query)
      .lean()
      .exec()

    if (req.query.$populate) {
      const relations = await Promise.all(
        blueprint.relations?.map(async relation => {
          const query = {
            ...getEntityQuery({ blueprint, req, permittedScopes }),
            blueprint: relation.target,
            identifier: {
              $in: Array.from(new Set(entities.map(entity => {
                return entity.metadata[relation.key];
              }).filter(Boolean)))
            }
          }
          return {
            key: relation.key,
            items: await BlueprintEntity.find(query).lean().exec()
          }
        })
      )

      entities.forEach(entity => {
        relations.forEach(relation => {
          entity.metadata[relation.key] = relation.items.find(item => item.identifier === entity.metadata[relation.key]);
        })
      })
    }

    res.json(entities).end();
  } catch (err) {
    logger.log('entities error', err);
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
    } else {
      res.status(500).json({ message: 'something went wrong with entities' }).end();
    }
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

    const reachedLimit = await hasReachedLimitations(req, blueprint, entity);
    if (reachedLimit) {
      res.status(403).json({ message: 'reached limit of allowed entities' }).end();
      return;
    }

    await entity.save();
    if (blueprint.dispatchers?.create) {
      logger.log('dispatch create event');
      emitPlatformEvent({
        tenant: entity.tenant,
        user: entity.user.toString(),
        source: 'blueprints',
        kind: blueprint.identifier,
        eventName: 'create',
        description: `${blueprint.name} created`,
        metadata: {
          workspace: entity.workspace?.toString(),
          entity: entity.identifier,
          blueprint: blueprint.identifier,
        },
      }).catch(logger.error);
    }

    res.status(200).json(entity).end()
    return;
  } catch (err) {
    logger.error(err);
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
    } else {
      res.status(500).json({ message: 'something went wrong with entity creation' }).end();
    }
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
    logger.error(err);
    if (err instanceof ResponseError) {
      res.status(err.status).json({ message: err.responseMessage }).end();
    } else {
      res.status(500).json({ message: 'something went wrong with entity' }).end();
    }
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