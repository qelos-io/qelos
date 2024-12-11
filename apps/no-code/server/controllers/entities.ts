import qs from 'qs'
import { v4 as uuidv4 } from 'uuid';
import BlueprintEntity, { IAuditItem, IBlueprintEntity } from '../models/blueprint-entity';
import Blueprint, { IBlueprint } from '../models/blueprint';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { CRUDOperation, PermissionScope } from '@qelos/global-types';
import mongoose from 'mongoose';
import logger from '../services/logger';
import {
  convertQueryToIndexes,
  getEntityIndexes,
  getEntityQuery,
  getValidBlueprintMetadata,
  updateEntityMapping,
  validateEntityRelations,
} from '../services/entities.service';
import { getUserPermittedScopes } from '../services/entities-permissions.service';
import { emitPlatformEvent } from '@qelos/api-kit';
import { ResponseError } from '../services/response-error';
import { getUsersByIds, getWorkspaces } from '../services/users';
import type { Request } from 'express';
import { hasGuestReachedLimit } from '../services/guest-request-limit';
import { getBlueprint } from '../services/blueprints.service';

function getAuditItem(req: Request): IAuditItem {
  return {
    ip: req.ip || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
    timestamp: new Date(),
  }
}

async function updateAllEntityMetadata(req: RequestWithUser, blueprint: IBlueprint, entity: IBlueprintEntity) {
  const body = req.body || {}

  // validate the metadata
  entity.metadata = getValidBlueprintMetadata(body.metadata, blueprint);

  // run the update mapping pre-save
  await updateEntityMapping(blueprint, entity);

  // validate the relations
  await validateEntityRelations(req.headers.tenant, blueprint, entity);

  entity.indexes = getEntityIndexes(blueprint, entity);
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

const GLOBAL_PERMITTED_FIELDS = '-auditInfo';

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
    delete query.$outerPopulate;
    if ('bypassAdmin' in req.query) {
      delete query.bypassAdmin;
    }
    convertQueryToIndexes(query, blueprint);
    const entities = await BlueprintEntity.find(query, permittedScopes === true ? null : GLOBAL_PERMITTED_FIELDS)
      .lean()
      .exec()

    if (req.query.$populate) {
      const uniqueWorkspaces: string[] = Array.from(new Set(entities.map(entity => entity.workspace?.toString()).filter(Boolean)));
      const uniqueUsers: string[] = Array.from(new Set(entities.map(entity => entity.user?.toString()).filter(Boolean)));

      const [workspaces, users, relations] = await Promise.all([
        uniqueWorkspaces.length ? getWorkspaces(req.headers.tenant, ['name', 'logo'], uniqueWorkspaces) : Promise.all([]),
        uniqueUsers.length ? getUsersByIds(req.headers.tenant, ['firstName', 'lastName', 'profileImage'], uniqueUsers) : Promise.all([]),
        Promise.all(
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
              items: await BlueprintEntity.find(query).select(GLOBAL_PERMITTED_FIELDS).lean().exec()
            }
          })
        )
      ])

      const workspacesMap = workspaces.reduce((map, workspace) => {
        map[workspace._id] = workspace;
        return map;
      }, {})

      const usersMap = users.reduce((map, user) => {
        map[user._id] = user;
        return map;
      }, {})

      entities.forEach(entity => {
        relations.forEach(relation => {
          entity.metadata[relation.key] = relation.items?.find(item => item.identifier === entity.metadata[relation.key]);
        })

        entity.workspace = workspacesMap[entity.workspace?.toString()];
        entity.user = usersMap[entity.user?.toString()];
      })
    }

    // outerPopulate can looks like:
    // ?$outerPopulate=setKey:blueprintName:scope,setKey:blueprintName:scope
    if (req.query.$outerPopulate) {
      const outerEntities = await Promise.all(
        req.query.$outerPopulate.split(',').map(async (expression: string = '') => {
          const [setKey, blueprintName, scope] = expression.split(':');
          const queryBuilder = {
            blueprintName,
            scope,
            setKey,
            blueprint: await getBlueprint(req.headers.tenant, blueprintName)
          };

          const relation = queryBuilder.blueprint.relations.find(bp => bp.target === blueprint.identifier);
          if (!relation) {
            return;
          }
          const permission = getUserPermittedScopes(req.user, queryBuilder.blueprint, CRUDOperation.READ, req.query.bypassAdmin);
          if (permission === true || permission.length > 0) {
            const entityQuery = getEntityQuery({ blueprint: queryBuilder.blueprint, req, permittedScopes: permission });
            if (queryBuilder.scope === PermissionScope.USER) {
              entityQuery.user = req.user._id;
            } else if (queryBuilder.scope === PermissionScope.WORKSPACE) {
              entityQuery.workspace = req.workspace?._id;
            }
            entityQuery.indexes = { $in: entities.map(entity => `${relation.key}:${entity.identifier}`) };
            return {
              entities: await BlueprintEntity.find(entityQuery).select(GLOBAL_PERMITTED_FIELDS).lean().exec(),
              key: queryBuilder.setKey,
              relationKey: relation.key,
            }
          }
        })
      )

      entities.forEach(entity => {
        outerEntities.forEach(outerEntity => {
          if (!outerEntity) {
            return;
          }
          entity[outerEntity.key] = outerEntity.entities?.filter(outer => outer.metadata[outerEntity.relationKey] === entity.identifier) || [];
        });
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
    const entity = await BlueprintEntity.findOne(query, permittedScopes === true ? null : GLOBAL_PERMITTED_FIELDS)
      .lean()
      .exec()

    if (!entity) {
      res.status(404).json({ message: 'entity not found' }).end();
      return;
    }

    if (req.query.$populate) {
      const [[workspace], [user]] = await Promise.all([
        entity.workspace ? getWorkspaces(req.headers.tenant, ['name', 'logo'], [entity.workspace.toString()]) : Promise.resolve([]),
        getUsersByIds(req.headers.tenant, ['firstName', 'lastName', 'profileImage'], [entity.user.toString()]),
        Promise.all(
          blueprint.relations?.map(async relation => {
            const relationIdentifier = entity.metadata[relation.key];
            if (!relationIdentifier) {
              return;
            }
            const query = {
              ...getEntityQuery({ blueprint, req, permittedScopes }),
              blueprint: relation.target,
              identifier: entity.metadata[relation.key]
            }
            entity.metadata[relation.key] = await BlueprintEntity.findOne(query).select(GLOBAL_PERMITTED_FIELDS).lean().exec()
          })
        )
      ])
      entity.user = user;
      entity.workspace = workspace;
    }

    res.json(entity).end();
  } catch {
    res.status(500).json({ message: 'something went wrong with entity' }).end();
  }
}

export async function createBlueprintEntity(req, res) {
  const guestMode = !req.user;
  const auditItem = getAuditItem(req);

  if (guestMode && await hasGuestReachedLimit(auditItem)) {
    res.status(403).json({ message: 'guest limit reached' }).end();
    return;
  }

  const blueprint: IBlueprint = req.blueprint;
  const bypassAdmin = typeof req.body?.bypassAdmin !== 'undefined' ? !!req.body?.bypassAdmin : req.query.bypassAdmin === 'true';
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.CREATE, bypassAdmin);
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
      auditInfo: { created: auditItem }
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

    const { auditInfo, ...response } = entity.toObject();

    res.status(200).json(response).end()
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
  const guestMode = !req.user;
  const auditItem = getAuditItem(req);

  if (guestMode && await hasGuestReachedLimit(auditItem)) {
    res.status(403).json({ message: 'guest limit reached' }).end();
    return;
  }

  const entityIdentifier = req.params.entityIdentifier;
  const blueprint: IBlueprint = req.blueprint;
  const bypassAdmin = typeof req.body?.bypassAdmin !== 'undefined' ? !!req.body?.bypassAdmin : req.query.bypassAdmin === 'true';
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.UPDATE, bypassAdmin);
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

    entity.auditInfo ||= { created: { ip: 'Unknown', userAgent: 'Unknown', timestamp: entity.created } };
    entity.auditInfo.updated = auditItem;

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

    const { auditInfo, ...response } = entity.toObject();

    res.status(200).json(response).end()
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
  const guestMode = !req.user;
  const auditItem = getAuditItem(req);

  if (guestMode && await hasGuestReachedLimit(auditItem)) {
    res.status(403).json({ message: 'guest limit reached' }).end();
    return;
  }
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
    const entity = await BlueprintEntity.findOne(query, permittedScopes === true ? null : GLOBAL_PERMITTED_FIELDS)
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

export async function removeAllBlueprintEntities(req, res) {
  const blueprintIdentifier = req.params.blueprintIdentifier.toString();

  const blueprintsWithRelations = await Blueprint.find({
    tenant: req.headers.tenant,
    'relations.target': blueprintIdentifier
  }).select('identifier relations').lean().exec();

  if (blueprintsWithRelations.length) {
    const entitiesOfRelations = await BlueprintEntity.countDocuments({
      tenant: req.headers.tenant,
      $or: blueprintsWithRelations
        .filter(blueprint => blueprint.identifier !== blueprintIdentifier)
        .map(blueprint => {
          const relation = blueprint.relations.find(relation => relation.target === blueprintIdentifier) as any;
          return {
            [`metadata.${relation.key}`]: {
              $exists: true
            },
            blueprint: blueprint.identifier
          }
        })
    }).exec();

    if (entitiesOfRelations) {
      res.status(403).json({ message: 'you cannot remove entities with related entities' }).end();
      return;
    }
  }

  try {
    const result = await BlueprintEntity.deleteMany({
      tenant: req.headers.tenant,
      blueprint: blueprintIdentifier
    }).exec();

    res.json(result).end();
  } catch {
    res.status(500).json({ message: 'something went wrong with entity deletion' }).end();
  }
}